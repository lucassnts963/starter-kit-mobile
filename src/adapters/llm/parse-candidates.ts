import type { LlmPointCandidate } from '../provider-ports';

/**
 * Valida a saída JSON do modelo: `{ points: [{ sectionId, text, anchor: { segmentId, quote } }] }`.
 * Saída malformada → lista vazia (tolerância: o loop ao vivo re-tenta no próximo delta);
 * candidatos sem os campos exigidos são descartados individualmente.
 */
export function parseCandidates(raw: string): LlmPointCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const points = (parsed as { points?: unknown }).points;
  if (!Array.isArray(points)) return [];

  const valid: LlmPointCandidate[] = [];
  for (const p of points as Partial<LlmPointCandidate>[]) {
    if (
      typeof p?.sectionId === 'string' &&
      typeof p.text === 'string' &&
      typeof p.anchor?.segmentId === 'string' &&
      typeof p.anchor.quote === 'string'
    ) {
      valid.push({
        sectionId: p.sectionId,
        text: p.text,
        anchor: { segmentId: p.anchor.segmentId, quote: p.anchor.quote },
      });
    }
  }
  return valid;
}

/** Instrução anti-alucinação compartilhada pelos provedores de LLM (REQ-05, risco §13). */
export const EXTRACTION_SYSTEM_PROMPT = [
  'Você extrai pontos objetivos de transcrições de reunião em pt-BR.',
  'Classifique cada ponto em uma das seções fornecidas (sectionId).',
  'Para cada ponto, "anchor.quote" deve conter somente trechos literais da transcrição',
  '(copie exatamente do texto do segmento indicado em anchor.segmentId).',
  'NÃO invente conteúdo, NÃO infira além do que foi dito. Se nada for relevante, retorne lista vazia.',
  'Responda APENAS JSON no formato {"points":[{"sectionId","text","anchor":{"segmentId","quote"}}]}.',
].join(' ');
