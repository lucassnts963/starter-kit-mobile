import { transition, type MeetingSessionState } from '../domain/meeting-session';
import { distinctSpeakers } from '../domain/transcript';
import { resolveMeetingType } from '../domain/templates';
import { anchorPoint, type ExtractedPoint } from '../domain/extracted-point';
import { buildMinutes } from '../domain/artifacts/minutes-builder';
import { buildRequirementsDoc } from '../domain/artifacts/requirements-builder';
import type { MeetingType } from '../domain/meeting-type';
import type { TranscriptSegment } from '../domain/transcript';
import { MeetingNotFoundError, type MeetingRepository, type MeetingRecord } from '../db/repository/meeting-repository';
import type { TranscriptRepository } from '../db/repository/transcript-repository';
import type { PointRepository } from '../db/repository/point-repository';
import type { ArtifactRepository } from '../db/repository/artifact-repository';
import type { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import { LOCAL_DRAFT_STT_ID, type LlmProvider, type SttBatchProvider } from '../adapters/provider-ports';
import type { Clock, IdGenerator } from './ports';

export interface RefinementResult {
  meetingId: string;
  ok: boolean;
  error?: string;
}

interface Deps {
  meetings: MeetingRepository;
  transcripts: TranscriptRepository;
  points: PointRepository;
  artifacts: ArtifactRepository;
  queue: RefinementQueueRepository;
  provider: SttBatchProvider;
  /** Opcional: extração em lote sobre a base final quando a reunião não tem pontos do ao vivo. */
  llm?: LlmProvider;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Fila offline-first do refinamento pós-reunião (REQ-03/06/07, NFR-06): transcreve o áudio
 * integral com o provedor selecionado (reusando a base final se já existir — retry não gasta
 * créditos de STT; provedor `local-draft` promove o rascunho do aparelho, custo zero), extrai
 * pontos via LLM quando a reunião não tem nenhum (importadas/sessão degradada) e gera os
 * artefatos deterministicamente. Falha nunca corrompe a sessão: a reunião volta a `ended`
 * e permanece na fila para nova tentativa.
 */
export class RefinementService {
  constructor(private readonly deps: Deps) {}

  async processQueue(): Promise<RefinementResult[]> {
    const results: RefinementResult[] = [];
    for (const item of await this.deps.queue.pending()) {
      results.push(await this.processOne(item.meetingId));
    }
    return results;
  }

  /**
   * Re-roda SÓ o passo do LLM + builders sobre a base final existente — nenhuma chamada de
   * STT (economia de créditos). Substitui os pontos e regenera os artefatos; não mexe em
   * status nem na fila (a reunião já está `done`).
   */
  async regenerateArtifacts(meetingId: string): Promise<RefinementResult> {
    try {
      const meeting = await this.deps.meetings.findById(meetingId);
      if (!meeting) throw new MeetingNotFoundError(meetingId);
      const type = resolveMeetingType(meeting.typeId);

      const segments = await this.deps.transcripts.listByMeeting(meetingId);
      const finalSegments = segments.filter((s) => s.kind === 'final');
      if (finalSegments.length === 0) {
        throw new Error('Sem transcrição final — rode o refinamento completo primeiro');
      }

      let points: ExtractedPoint[];
      if (this.deps.llm) {
        await this.deps.points.deleteByMeeting(meetingId);
        points = await this.extractFromFinal(meetingId, type, finalSegments);
      } else {
        points = await this.deps.points.listByMeeting(meetingId);
      }
      await this.saveArtifacts(meeting, type, finalSegments, points);
      return { meetingId, ok: true };
    } catch (error) {
      return { meetingId, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async processOne(meetingId: string): Promise<RefinementResult> {
    let meeting: MeetingRecord | null = null;
    try {
      meeting = await this.deps.meetings.findById(meetingId);
      if (!meeting) throw new MeetingNotFoundError(meetingId);

      await this.setStatus(meeting, 'startRefinement');
      const type = resolveMeetingType(meeting.typeId);

      // retry barato: base final de uma tentativa anterior é reusada (STT já foi pago)
      const existing = await this.deps.transcripts.listByMeeting(meeting.id);
      let finalSegments = existing.filter((s) => s.kind === 'final');
      if (finalSegments.length === 0) {
        finalSegments = await this.buildFinalBase(meeting, existing);
        await this.deps.transcripts.replaceKind(meeting.id, 'final', finalSegments);
      }

      // pontos do ao vivo (quando a sessão os produziu) são mantidos — zero tokens extras;
      // sem nenhum ponto (importada/degradada), a extração em lote preenche a ata (bugfix)
      let points = await this.deps.points.listByMeeting(meeting.id);
      if (points.length === 0 && this.deps.llm) {
        points = await this.extractFromFinal(meeting.id, type, finalSegments);
      }
      await this.saveArtifacts(meeting, type, finalSegments, points);

      await this.setStatus({ ...meeting, status: 'refining' }, 'completeRefinement');
      await this.deps.queue.remove(meeting.id);
      return { meetingId, ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deps.queue.recordFailure(meetingId, message);
      const current = await this.deps.meetings.findById(meetingId);
      if (current?.status === 'refining') {
        await this.setStatus(current, 'refinementFailed');
      }
      return { meetingId, ok: false, error: message };
    }
  }

  /** Base final: `local-draft` promove o rascunho (custo zero); demais transcrevem o áudio. */
  private async buildFinalBase(meeting: MeetingRecord, existing: TranscriptSegment[]): Promise<TranscriptSegment[]> {
    if (this.deps.provider.id === LOCAL_DRAFT_STT_ID) {
      const drafts = existing.filter((s) => s.kind === 'draft');
      if (drafts.length === 0) {
        throw new Error(
          'Sem rascunho local para esta reunião (importada ou sem STT ao vivo) — escolha um provedor de transcrição em nuvem',
        );
      }
      return drafts.map((d) => ({
        id: this.deps.ids.newId(),
        kind: 'final' as const,
        text: d.text,
        startMs: d.startMs,
        endMs: d.endMs,
      }));
    }

    const raw = await this.deps.provider.transcribe(meeting.audioSegments, { language: 'pt' });
    return raw.map((r) => ({
      id: this.deps.ids.newId(),
      kind: 'final' as const,
      text: r.text,
      startMs: r.startMs,
      endMs: r.endMs,
      ...(r.speaker !== undefined ? { speaker: r.speaker } : {}),
    }));
  }

  /** Extração em lote com a mesma validação anti-alucinação do ao vivo (âncora literal, REQ-05). */
  private async extractFromFinal(
    meetingId: string,
    type: MeetingType,
    finalSegments: TranscriptSegment[],
  ): Promise<ExtractedPoint[]> {
    const candidates = await this.deps.llm!.extractPoints({
      meetingTypeName: type.name,
      sections: type.sections.map(({ id, title }) => ({ id, title })),
      transcript: finalSegments.map((s) => ({ segmentId: s.id, text: s.text })),
    });
    const saved: ExtractedPoint[] = [];
    for (const candidate of candidates) {
      try {
        const point = anchorPoint({ id: this.deps.ids.newId(), ...candidate }, finalSegments);
        await this.deps.points.save(meetingId, point);
        saved.push(point);
      } catch {
        // âncora inválida — candidato alucinado descartado (REQ-05)
      }
    }
    return saved;
  }

  private async saveArtifacts(
    meeting: MeetingRecord,
    type: MeetingType,
    finalSegments: TranscriptSegment[],
    points: ExtractedPoint[],
  ): Promise<void> {
    const meta = {
      title: meeting.title,
      date: meeting.createdAt.slice(0, 10),
      speakers: distinctSpeakers(finalSegments),
    };
    await this.deps.artifacts.save(meeting.id, 'minutes', buildMinutes(meta, type, points), this.deps.clock.nowIso());
    if (type.output === 'minutes+requirements') {
      await this.deps.artifacts.save(
        meeting.id,
        'requirements',
        buildRequirementsDoc(meta, type, points),
        this.deps.clock.nowIso(),
      );
    }
  }

  private async setStatus(meeting: MeetingRecord, event: 'startRefinement' | 'completeRefinement' | 'refinementFailed'): Promise<void> {
    const state: MeetingSessionState = {
      meetingId: meeting.id,
      status: meeting.status,
      audioSegments: meeting.audioSegments,
    };
    const next = transition(state, event);
    await this.deps.meetings.save({ ...meeting, status: next.status });
  }
}
