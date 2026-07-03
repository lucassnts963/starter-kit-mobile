export type TranscriptKind = 'draft' | 'final';

export interface TranscriptSegment {
  id: string;
  kind: TranscriptKind;
  text: string;
  startMs: number;
  endMs: number;
}

export class DuplicateSegmentError extends Error {
  constructor(id: string) {
    super(`Segmento de transcrição duplicado: "${id}"`);
    this.name = 'DuplicateSegmentError';
  }
}

export function addSegment(segments: TranscriptSegment[], segment: TranscriptSegment): TranscriptSegment[] {
  if (segments.some((s) => s.id === segment.id)) {
    throw new DuplicateSegmentError(segment.id);
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
