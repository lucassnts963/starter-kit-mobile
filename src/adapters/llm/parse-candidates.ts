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
  'Extraia TODOS os pontos relevantes — seja abrangente: decisões, requisitos, problemas,',
  'responsáveis, prazos, riscos e pendências. Prefira vários pontos curtos a poucos genéricos.',
  'Classifique cada ponto na seção mais adequada dentre as fornecidas; use o sectionId',
  'exatamente como veio na lista de seções.',
  'O campo "text" é a sua síntese objetiva do ponto (pode reescrever, em pt-BR claro).',
  'O campo "anchor.quote" é DIFERENTE: copie um trecho CURTO e LITERAL da transcrição (5–15 palavras)',
  'exatamente como aparece no texto — sem reescrever, sem corrigir, sem traduzir, preservando acentos.',
  'Em "anchor.segmentId" indique o id do segmento de onde tirou a citação.',
  'NÃO invente conteúdo nem infira além do que foi dito. Se nada for relevante, retorne lista vazia.',
  'Responda APENAS JSON no formato {"points":[{"sectionId","text","anchor":{"segmentId","quote"}}]}.',
].join(' ');
