import type { TranscriptSegment } from './transcript';

export interface PointAnchor {
  segmentId: string;
  /** Citação literal do trecho da transcrição que originou o ponto. */
  quote: string;
}

export interface ExtractedPoint {
  id: string;
  sectionId: string;
  text: string;
  anchor: PointAnchor;
}

export class AnchorError extends Error {
  constructor(reason: string) {
    super(`Âncora inválida: ${reason}`);
    this.name = 'AnchorError';
  }
}

/**
 * Anti-alucinação (REQ-05, risco "LLM inventar conteúdo"): um ponto só existe se a
 * citação estiver literalmente contida no segmento referenciado da transcrição.
 */
export function anchorPoint(point: ExtractedPoint, segments: TranscriptSegment[]): ExtractedPoint {
  const segment = segments.find((s) => s.id === point.anchor.segmentId);
  if (!segment) {
    throw new AnchorError(`segmento "${point.anchor.segmentId}" não existe na transcrição`);
  }
  if (!segment.text.includes(point.anchor.quote)) {
    throw new AnchorError(`citação não encontrada no segmento "${segment.id}"`);
  }
  return { ...point, anchor: { ...point.anchor } };
}

export function movePoint(point: ExtractedPoint, sectionId: string): ExtractedPoint {
  return { ...point, sectionId, anchor: { ...point.anchor } };
}

export function editPointText(point: ExtractedPoint, text: string): ExtractedPoint {
  if (text.trim() === '') {
    throw new Error('Texto do ponto não pode ser vazio');
  }
  return { ...point, text, anchor: { ...point.anchor } };
}
