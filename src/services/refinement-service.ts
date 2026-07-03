import { transition, type MeetingSessionState } from '../domain/meeting-session';
import { resolveMeetingType } from '../domain/templates';
import { buildMinutes } from '../domain/artifacts/minutes-builder';
import { buildRequirementsDoc } from '../domain/artifacts/requirements-builder';
import type { TranscriptSegment } from '../domain/transcript';
import { MeetingNotFoundError, type MeetingRepository, type MeetingRecord } from '../db/repository/meeting-repository';
import type { TranscriptRepository } from '../db/repository/transcript-repository';
import type { PointRepository } from '../db/repository/point-repository';
import type { ArtifactRepository } from '../db/repository/artifact-repository';
import type { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import type { SttBatchProvider } from '../adapters/provider-ports';
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
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Fila offline-first do refinamento pós-reunião (REQ-03/06/07, NFR-06): re-transcreve o
 * áudio integral com o provedor selecionado, substitui a base final (com falantes — REQ-12)
 * e gera os artefatos deterministicamente. Falha nunca corrompe a sessão: a reunião volta
 * a `ended` e permanece na fila para nova tentativa.
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

  private async processOne(meetingId: string): Promise<RefinementResult> {
    let meeting: MeetingRecord | null = null;
    try {
      meeting = await this.deps.meetings.findById(meetingId);
      if (!meeting) throw new MeetingNotFoundError(meetingId);

      await this.setStatus(meeting, 'startRefinement');
      const type = resolveMeetingType(meeting.typeId);

      const raw = await this.deps.provider.transcribe(meeting.audioSegments, { language: 'pt' });
      const finalSegments: TranscriptSegment[] = raw.map((r) => ({
        id: this.deps.ids.newId(),
        kind: 'final',
        text: r.text,
        startMs: r.startMs,
        endMs: r.endMs,
        ...(r.speaker !== undefined ? { speaker: r.speaker } : {}),
      }));
      await this.deps.transcripts.replaceKind(meeting.id, 'final', finalSegments);

      const points = await this.deps.points.listByMeeting(meeting.id);
      const meta = { title: meeting.title, date: meeting.createdAt.slice(0, 10) };
      await this.deps.artifacts.save(meeting.id, 'minutes', buildMinutes(meta, type, points), this.deps.clock.nowIso());
      if (type.output === 'minutes+requirements') {
        await this.deps.artifacts.save(
          meeting.id,
          'requirements',
          buildRequirementsDoc(meta, type, points),
          this.deps.clock.nowIso(),
        );
      }

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
