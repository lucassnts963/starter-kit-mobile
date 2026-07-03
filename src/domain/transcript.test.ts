import {
  addSegment,
  artifactBase,
  hasFinal,
  fullText,
  type TranscriptSegment,
} from './transcript';

const seg = (id: string, kind: 'draft' | 'final', text: string, startMs = 0): TranscriptSegment => ({
  id,
  kind,
  text,
  startMs,
  endMs: startMs + 1000,
});

describe('transcript kinds (TEST-03)', () => {
  it('should exclude draft segments from the artifact base', () => {
    const segments = [seg('d1', 'draft', 'rascunho impreciso'), seg('f1', 'final', 'texto refinado')];
    const base = artifactBase(segments);
    expect(base).toHaveLength(1);
    expect(base[0]?.id).toBe('f1');
  });

  it('should return an empty artifact base when only drafts exist', () => {
    const segments = [seg('d1', 'draft', 'só rascunho')];
    expect(artifactBase(segments)).toEqual([]);
    expect(hasFinal(segments)).toBe(false);
  });

  it('should report hasFinal when a final segment is added', () => {
    let segments: TranscriptSegment[] = [];
    segments = addSegment(segments, seg('d1', 'draft', 'oi'));
    segments = addSegment(segments, seg('f1', 'final', 'olá'));
    expect(hasFinal(segments)).toBe(true);
  });

  it('should keep segments ordered by startMs when adding out of order', () => {
    let segments: TranscriptSegment[] = [];
    segments = addSegment(segments, seg('b', 'draft', 'segundo', 2000));
    segments = addSegment(segments, seg('a', 'draft', 'primeiro', 1000));
    expect(segments.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('should build fullText from the requested kind only', () => {
    const segments = [
      seg('d1', 'draft', 'rascunho um', 0),
      seg('f1', 'final', 'final um', 0),
      seg('f2', 'final', 'final dois', 1000),
    ];
    expect(fullText(segments, 'final')).toBe('final um\nfinal dois');
    expect(fullText(segments, 'draft')).toBe('rascunho um');
  });

  it('should reject a segment with duplicated id', () => {
    const segments = [seg('x', 'draft', 'a')];
    expect(() => addSegment(segments, seg('x', 'draft', 'b'))).toThrow();
  });
});
