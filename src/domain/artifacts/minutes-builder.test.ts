import { buildMinutes } from './minutes-builder';
import { parseMeetingType } from '../meeting-type';
import { genericMeetingTemplate } from '../templates/generic-meeting';
import type { ExtractedPoint } from '../extracted-point';

const type = parseMeetingType(genericMeetingTemplate);

const points: ExtractedPoint[] = [
  { id: 'p1', sectionId: 'topics', text: 'Apresentado o fluxo atual de vendas', anchor: { segmentId: 's1', quote: 'fluxo atual' } },
  { id: 'p2', sectionId: 'decisions', text: 'MVP será mobile-first', anchor: { segmentId: 's2', quote: 'mobile-first' } },
  { id: 'p3', sectionId: 'open-items', text: 'Validar orçamento com financeiro', anchor: { segmentId: 's3', quote: 'orçamento' } },
  { id: 'p4', sectionId: 'action-items', text: 'Enviar proposta até sexta', anchor: { segmentId: 's4', quote: 'até sexta' } },
];

describe('minutes builder completeness (TEST-07)', () => {
  it('should include every extracted point in the minutes (sem deixar passar nada)', () => {
    const md = buildMinutes({ title: 'Kickoff', date: '2026-07-03' }, type, points);
    for (const p of points) {
      expect(md).toContain(p.text);
    }
  });

  it('should not invent content beyond the extracted points and template headings', () => {
    const md = buildMinutes({ title: 'Kickoff', date: '2026-07-03' }, type, points);
    const allowed = [
      'Kickoff',
      '2026-07-03',
      ...type.sections.map((s) => s.title),
      ...points.map((p) => p.text),
    ];
    // toda linha não-vazia do markdown deriva do template ou dos pontos
    for (const line of md.split('\n').filter((l) => l.trim() !== '' && l.trim() !== '---')) {
      const clean = line.replace(/^#+\s*|^[-*]\s*|\*\*/g, '').trim();
      expect(allowed.some((a) => a.includes(clean) || clean.includes(a))).toBe(true);
    }
  });

  it('should render empty sections with their heading (nada é ocultado silenciosamente)', () => {
    const md = buildMinutes({ title: 'Kickoff', date: '2026-07-03' }, type, []);
    for (const section of type.sections) {
      expect(md).toContain(section.title);
    }
  });

  it('should include title and date in the header', () => {
    const md = buildMinutes({ title: 'Reunião X', date: '2026-07-03' }, type, []);
    expect(md).toContain('Reunião X');
    expect(md).toContain('2026-07-03');
  });

  it('should list participants when speakers are provided (diarização, REQ-12)', () => {
    const md = buildMinutes(
      { title: 'Reunião X', date: '2026-07-03', speakers: ['Cliente – João', 'Falante 2'] },
      type,
      [],
    );
    expect(md).toContain('Participantes');
    expect(md).toContain('Cliente – João, Falante 2');
    // sem falantes, a linha não aparece
    expect(buildMinutes({ title: 'Y', date: '2026-07-03' }, type, [])).not.toContain('Participantes');
  });
});
