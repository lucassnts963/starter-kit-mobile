import type { MeetingType } from './meeting-type';
import type { ExtractedPoint } from './extracted-point';

export interface Coverage {
  covered: string[];
  pending: string[];
}

export interface QuestionSuggestion {
  sectionId: string;
  sectionTitle: string;
  question: string;
}

export interface SuggestOptions {
  /** Perguntas descartadas pelo condutor nesta sessão (não voltam a ser sugeridas). */
  dismissed?: Set<string>;
}

/**
 * Motor de cobertura (REQ-04): uma seção do roteiro está coberta quando tem ao menos
 * um ponto extraído. Pontos de seções fora do template são ignorados.
 */
export function computeCoverage(type: MeetingType, points: ExtractedPoint[]): Coverage {
  const withPoints = new Set(points.map((p) => p.sectionId));
  const covered: string[] = [];
  const pending: string[] = [];
  for (const section of type.sections) {
    (withPoints.has(section.id) ? covered : pending).push(section.id);
  }
  return { covered, pending };
}

/**
 * Perguntas sugeridas vêm SOMENTE do roteiro do template (determinístico — o LLM
 * apenas reformula/contextualiza na camada de serviço), e só para seções pendentes.
 */
export function suggestQuestions(
  type: MeetingType,
  points: ExtractedPoint[],
  options: SuggestOptions = {},
): QuestionSuggestion[] {
  const dismissed = options.dismissed ?? new Set<string>();
  const { pending } = computeCoverage(type, points);
  const pendingSet = new Set(pending);
  const suggestions: QuestionSuggestion[] = [];
  for (const section of type.sections) {
    if (!pendingSet.has(section.id)) continue;
    for (const question of section.questions) {
      if (dismissed.has(question)) continue;
      suggestions.push({ sectionId: section.id, sectionTitle: section.title, question });
    }
  }
  return suggestions;
}
