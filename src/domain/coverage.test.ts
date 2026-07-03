import { computeCoverage, suggestQuestions } from './coverage';
import { parseMeetingType } from './meeting-type';
import type { ExtractedPoint } from './extracted-point';

const type = parseMeetingType({
  id: 'mini',
  name: 'Mini levantamento',
  output: 'minutes+requirements',
  sections: [
    { id: 'problem', title: 'Problema', questions: ['Qual é o problema?', 'O que custa não resolver?'] },
    { id: 'stakeholders', title: 'Stakeholders', questions: ['Quem é afetado?'] },
    { id: 'risks', title: 'Riscos', questions: ['O que pode dar errado?'] },
  ],
});

const point = (id: string, sectionId: string): ExtractedPoint => ({
  id,
  sectionId,
  text: `ponto ${id}`,
  anchor: { segmentId: 's1', quote: 'trecho' },
});

describe('coverage engine marks sections (TEST-04)', () => {
  it('should mark a section covered when it has at least one point', () => {
    const { covered, pending } = computeCoverage(type, [point('p1', 'problem')]);
    expect(covered).toEqual(['problem']);
    expect(pending).toEqual(['stakeholders', 'risks']);
  });

  it('should list every section as pending when there are no points', () => {
    const { covered, pending } = computeCoverage(type, []);
    expect(covered).toEqual([]);
    expect(pending).toEqual(['problem', 'stakeholders', 'risks']);
  });

  it('should ignore points that reference sections outside the template', () => {
    const { covered } = computeCoverage(type, [point('p1', 'inexistente')]);
    expect(covered).toEqual([]);
  });
});

describe('next questions come from template (TEST-05)', () => {
  it('should only suggest questions belonging to the template roadmap', () => {
    const suggestions = suggestQuestions(type, []);
    const allTemplateQuestions = type.sections.flatMap((s) => s.questions);
    for (const s of suggestions) {
      expect(allTemplateQuestions).toContain(s.question);
    }
  });

  it('should not suggest questions for covered sections', () => {
    const suggestions = suggestQuestions(type, [point('p1', 'problem')]);
    expect(suggestions.some((s) => s.sectionId === 'problem')).toBe(false);
    expect(suggestions.some((s) => s.sectionId === 'stakeholders')).toBe(true);
  });

  it('should exclude dismissed questions without removing the section from pending', () => {
    const dismissed = new Set(['Quem é afetado?']);
    const suggestions = suggestQuestions(type, [], { dismissed });
    expect(suggestions.some((s) => s.question === 'Quem é afetado?')).toBe(false);
    // seção continua pendente mesmo com a única pergunta descartada
    expect(computeCoverage(type, []).pending).toContain('stakeholders');
  });

  it('should return no suggestions when every section is covered', () => {
    const points = [point('p1', 'problem'), point('p2', 'stakeholders'), point('p3', 'risks')];
    expect(suggestQuestions(type, points)).toEqual([]);
  });
});
