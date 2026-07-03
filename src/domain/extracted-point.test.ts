import { anchorPoint, movePoint, editPointText, AnchorError } from './extracted-point';
import type { TranscriptSegment } from './transcript';

const segments: TranscriptSegment[] = [
  { id: 's1', kind: 'draft', text: 'o sistema precisa gravar reuniões de duas horas', startMs: 0, endMs: 5000 },
  { id: 's2', kind: 'draft', text: 'o cliente quer exportar a ata em markdown', startMs: 5000, endMs: 9000 },
];

describe('extracted point anchoring (TEST-06)', () => {
  it('should accept a point whose anchor quote exists in the referenced segment', () => {
    const point = anchorPoint(
      {
        id: 'p1',
        sectionId: 'functional-requirements',
        text: 'Gravação de reuniões longas (2h)',
        anchor: { segmentId: 's1', quote: 'gravar reuniões de duas horas' },
      },
      segments,
    );
    expect(point.anchor.segmentId).toBe('s1');
  });

  it('should reject a point whose segment does not exist (anti-alucinação)', () => {
    expect(() =>
      anchorPoint(
        {
          id: 'p1',
          sectionId: 'functional-requirements',
          text: 'Inventado',
          anchor: { segmentId: 'nope', quote: 'qualquer coisa' },
        },
        segments,
      ),
    ).toThrow(AnchorError);
  });

  it('should reject a point whose quote is not contained in the segment text (anti-alucinação)', () => {
    expect(() =>
      anchorPoint(
        {
          id: 'p1',
          sectionId: 'functional-requirements',
          text: 'Inventado',
          anchor: { segmentId: 's1', quote: 'sincronizar com a nuvem' },
        },
        segments,
      ),
    ).toThrow(AnchorError);
  });

  it('should move a point to another section preserving the anchor', () => {
    const point = anchorPoint(
      {
        id: 'p1',
        sectionId: 'functional-requirements',
        text: 'Export em markdown',
        anchor: { segmentId: 's2', quote: 'exportar a ata em markdown' },
      },
      segments,
    );
    const moved = movePoint(point, 'out-of-scope');
    expect(moved.sectionId).toBe('out-of-scope');
    expect(moved.anchor).toEqual(point.anchor);
  });

  it('should edit the point text preserving the anchor (correção manual do condutor)', () => {
    const point = anchorPoint(
      {
        id: 'p1',
        sectionId: 'functional-requirements',
        text: 'Export em md',
        anchor: { segmentId: 's2', quote: 'exportar a ata em markdown' },
      },
      segments,
    );
    const edited = editPointText(point, 'Exportação da ata em Markdown via share sheet');
    expect(edited.text).toBe('Exportação da ata em Markdown via share sheet');
    expect(edited.anchor).toEqual(point.anchor);
    expect(() => editPointText(point, '   ')).toThrow();
  });
});
