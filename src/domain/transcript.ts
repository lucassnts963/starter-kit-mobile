export type TranscriptKind = 'draft' | 'final';

export interface TranscriptSegment {
  id: string;
  kind: TranscriptKind;
  text: string;
  startMs: number;
  endMs: number;
  /** Falante identificado pela diarização (REQ-12). Só existe em segmentos `final` — C-06. */
  speaker?: string;
}

export class DuplicateSegmentError extends Error {
  constructor(id: string) {
    super(`Segmento de transcrição duplicado: "${id}"`);
    this.name = 'DuplicateSegmentError';
  }
}

export class DraftSpeakerError extends Error {
  constructor(id: string) {
    super(`Segmento draft "${id}" não pode ter falante — diarização só existe no refinamento (C-06)`);
    this.name = 'DraftSpeakerError';
  }
}

export function addSegment(segments: TranscriptSegment[], segment: TranscriptSegment): TranscriptSegment[] {
  if (segments.some((s) => s.id === segment.id)) {
    throw new DuplicateSegmentError(segment.id);
  }
  if (segment.kind === 'draft' && segment.speaker !== undefined) {
    throw new DraftSpeakerError(segment.id);
  }
  return [...segments, segment].sort((a, b) => a.startMs - b.startMs);
}

/**
 * Base dos artefatos finais (REQ-03 / ADR-004): ata e requirements.md são gerados
 * SOMENTE a partir da transcrição refinada (`kind: final`) — nunca do rascunho ao vivo.
 */
export function artifactBase(segments: TranscriptSegment[]): TranscriptSegment[] {
  return segments.filter((s) => s.kind === 'final');
}

export function hasFinal(segments: TranscriptSegment[]): boolean {
  return segments.some((s) => s.kind === 'final');
}

export function fullText(segments: TranscriptSegment[], kind: TranscriptKind): string {
  return segments
    .filter((s) => s.kind === kind)
    .map((s) => s.text)
    .join('\n');
}

/** Falantes distintos da transcrição refinada, na ordem da primeira fala (REQ-12). */
export function distinctSpeakers(segments: TranscriptSegment[]): string[] {
  const speakers: string[] = [];
  for (const s of artifactBase(segments)) {
    if (s.speaker !== undefined && !speakers.includes(s.speaker)) {
      speakers.push(s.speaker);
    }
  }
  return speakers;
}

/**
 * Renomeia um falante em toda a transcrição (ex.: "Falante 1" → "Cliente – João").
 * Função pura: a propagação para ata/requisitos acontece regenerando os builders (REQ-12).
 */
export function renameSpeaker(
  segments: TranscriptSegment[],
  from: string,
  to: string,
): TranscriptSegment[] {
  if (to.trim() === '') {
    throw new Error('Nome do falante não pode ser vazio');
  }
  return segments.map((s) => (s.speaker === from ? { ...s, speaker: to } : s));
}
