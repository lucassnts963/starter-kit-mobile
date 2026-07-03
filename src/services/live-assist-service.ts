import { anchorPoint, type ExtractedPoint } from '../domain/extracted-point';
import { computeCoverage, suggestQuestions, type Coverage, type QuestionSuggestion } from '../domain/coverage';
import type { MeetingType } from '../domain/meeting-type';
import type { TranscriptRepository } from '../db/repository/transcript-repository';
import type { PointRepository } from '../db/repository/point-repository';
import type { LlmProvider } from '../adapters/provider-ports';
import type { IdGenerator } from './ports';

export type LiveAssistResult =
  | {
      ok: true;
      added: ExtractedPoint[];
      /** Candidatos descartados por âncora inválida (anti-alucinação). */
      dropped: number;
      coverage: Coverage;
      suggestions: QuestionSuggestion[];
    }
  | { ok: false; error: string };

interface Deps {
  transcripts: TranscriptRepository;
  points: PointRepository;
  llm: LlmProvider;
  ids: IdGenerator;
}

/**
 * Loop de assistência ao vivo (REQ-04/05): a cada chamada, envia ao LLM apenas o delta
 * da transcrição, valida cada candidato contra a transcrição real (descarta alucinação)
 * e devolve cobertura + perguntas do roteiro. Falha de LLM degrada para somente-gravação
 * (`ok:false`, nada salvo, delta preservado para re-tentativa) — nunca lança (NFR-06).
 */
export class LiveAssistService {
  /** Cursor por reunião: quantos segmentos já foram enviados ao LLM (estado da sessão). */
  private readonly cursors = new Map<string, number>();

  constructor(private readonly deps: Deps) {}

  async processDelta(meetingId: string, type: MeetingType): Promise<LiveAssistResult> {
    try {
      const segments = await this.deps.transcripts.listByMeeting(meetingId);
      const cursor = this.cursors.get(meetingId) ?? 0;
      const delta = segments.slice(cursor);

      const added: ExtractedPoint[] = [];
      let dropped = 0;

      if (delta.length > 0) {
        const candidates = await this.deps.llm.extractPoints({
          meetingTypeName: type.name,
          sections: type.sections.map(({ id, title }) => ({ id, title })),
          transcript: delta.map((s) => ({ segmentId: s.id, text: s.text })),
        });
        // delta só é consumido depois de o LLM responder — falha re-tenta o mesmo trecho
        this.cursors.set(meetingId, segments.length);

        for (const candidate of candidates) {
          try {
            const point = anchorPoint(
              { id: this.deps.ids.newId(), ...candidate },
              segments,
            );
            await this.deps.points.save(meetingId, point);
            added.push(point);
          } catch {
            dropped += 1;
          }
        }
      }

      const allPoints = await this.deps.points.listByMeeting(meetingId);
      return {
        ok: true,
        added,
        dropped,
        coverage: computeCoverage(type, allPoints),
        suggestions: suggestQuestions(type, allPoints),
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
