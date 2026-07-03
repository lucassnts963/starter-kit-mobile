import { buildRequirementsDoc } from './requirements-builder';
import { parseMeetingType } from '../meeting-type';
import { requirementsElicitationTemplate } from '../templates/requirements-elicitation';
import type { ExtractedPoint } from '../extracted-point';

const type = parseMeetingType(requirementsElicitationTemplate);

const points: ExtractedPoint[] = [
  {
    id: 'p1',
    sectionId: 'problem',
    text: 'Atas manuais perdem informação e atrasam o projeto',
    anchor: { segmentId: 's1', quote: 'perdem informação' },
  },
  {
    id: 'p2',
    sectionId: 'functional-requirements',
    text: 'O sistema deve gravar e transcrever reuniões',
    anchor: { segmentId: 's2', quote: 'gravar e transcrever' },
  },
];

describe('requirements builder emits kit template (TEST-08)', () => {
  it('should emit one section heading per template section', () => {
    const md = buildRequirementsDoc({ title: 'Levantamento CRM', date: '2026-07-03' }, type, points);
    for (const section of type.sections) {
      expect(md).toContain(section.title);
    }
  });

  it('should place extracted points under their sections', () => {
    const md = buildRequirementsDoc({ title: 'Levantamento CRM', date: '2026-07-03' }, type, points);
    expect(md).toContain('Atas manuais perdem informação e atrasam o projeto');
    expect(md).toContain('O sistema deve gravar e transcrever reuniões');
  });

  it('should turn uncovered sections into Open Questions with the template questions', () => {
    const md = buildRequirementsDoc({ title: 'Levantamento CRM', date: '2026-07-03' }, type, points);
    expect(md).toContain('## Open Questions');
    // 'risks' não foi coberto — as perguntas-guia da seção viram checklist
    const risksSection = type.sections.find((s) => s.id === 'risks');
    for (const q of risksSection?.questions ?? []) {
      expect(md).toContain(`- [ ] ${q}`);
    }
  });

  it('should not list covered sections in Open Questions', () => {
    const md = buildRequirementsDoc({ title: 'Levantamento CRM', date: '2026-07-03' }, type, points);
    const openQuestionsPart = md.slice(md.indexOf('## Open Questions'));
    const problemSection = type.sections.find((s) => s.id === 'problem');
    expect(openQuestionsPart).not.toContain(problemSection?.title ?? 'nunca');
  });

  it('should have no Open Questions checklist when everything is covered', () => {
    const allCovered: ExtractedPoint[] = type.sections.map((s, i) => ({
      id: `p${i}`,
      sectionId: s.id,
      text: `Ponto da seção ${s.title}`,
      anchor: { segmentId: 's1', quote: 'x' },
    }));
    const md = buildRequirementsDoc({ title: 'Completo', date: '2026-07-03' }, type, allCovered);
    expect(md).not.toContain('- [ ]');
  });
});
