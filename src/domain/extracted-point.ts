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
 * Normaliza para comparação de citação: minúsculas, espaços colapsados, pontuação de borda
 * removida. Mantém as letras (acentos incluídos) — a citação ainda precisa ser real, só tolera
 * as variações típicas do LLM (capitalização, espaçamento, aspas/ponto final) que antes
 * derrubavam pontos válidos silenciosamente.
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’.,;:!?()[\]-]+|[\s"'“”‘’.,;:!?()[\]-]+$/g, '')
    .trim();
}

/**
 * Anti-alucinação (REQ-05, risco "LLM inventar conteúdo"): um ponto só existe se a citação
 * estiver realmente na transcrição. A busca é tolerante (case/espaço/pontuação) e cobre TODOS
 * os segmentos — o LLM erra com frequência o `segmentId` ou normaliza a citação, e antes isso
 * derrubava pontos legítimos (ata quase vazia). Quando a citação é encontrada, o ponto é
 * re-ancorado ao segmento que de fato a contém; se não existe em lugar nenhum, é rejeitado.
 */
export function anchorPoint(point: ExtractedPoint, segments: TranscriptSegment[]): ExtractedPoint {
  const needle = normalizeForMatch(point.anchor.quote);
  if (needle === '') {
    throw new AnchorError('citação vazia');
  }
  const match = segments.find((s) => normalizeForMatch(s.text).includes(needle));
  if (!match) {
    throw new AnchorError(`citação "${point.anchor.quote}" não encontrada em nenhum segmento`);
  }
  return { ...point, anchor: { ...point.anchor, segmentId: match.id } };
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
