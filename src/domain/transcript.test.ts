import {
  addSegment,
  artifactBase,
  hasFinal,
  fullText,
  distinctSpeakers,
  renameSpeaker,
  DraftSpeakerError,
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

const spoken = (
  id: string,
  kind: 'draft' | 'final',
  text: string,
  speaker?: string,
  startMs = 0,
): TranscriptSegment => ({ id, kind, text, startMs, endMs: startMs + 1000, speaker });

describe('speakers on final segments (TEST-15, REQ-12)', () => {
  it('should accept speaker on final segments (diarização vem do refinamento)', () => {
    let segments: TranscriptSegment[] = [];
    segments = addSegment(segments, spoken('f1', 'final', 'proposta aprovada', 'Falante 1'));
    expect(segments[0]?.speaker).toBe('Falante 1');
  });

  it('should reject speaker on draft segments (STT nativo não diariza — C-06)', () => {
    expect(() => addSegment([], spoken('d1', 'draft', 'oi', 'Falante 1'))).toThrow(DraftSpeakerError);
  });

  it('should list distinct speakers from final segments only, in order of first appearance', () => {
    let segments: TranscriptSegment[] = [];
    segments = addSegment(segments, spoken('f1', 'final', 'a', 'Falante 1', 0));
    segments = addSegment(segments, spoken('f2', 'final', 'b', 'Falante 2', 1000));
    segments = addSegment(segments, spoken('f3', 'final', 'c', 'Falante 1', 2000));
    segments = addSegment(segments, spoken('d1', 'draft', 'd', undefined, 3000));
    expect(distinctSpeakers(segments)).toEqual(['Falante 1', 'Falante 2']);
  });

  it('should return an empty speaker list when the provider did not diarize', () => {
    const segments = [spoken('f1', 'final', 'sem falantes')];
    expect(distinctSpeakers(segments)).toEqual([]);
  });
});

describe('speaker rename propagates (TEST-16, REQ-12)', () => {
  const base = (): TranscriptSegment[] => [
    spoken('f1', 'final', 'a', 'Falante 1', 0),
    spoken('f2', 'final', 'b', 'Falante 2', 1000),
    spoken('f3', 'final', 'c', 'Falante 1', 2000),
  ];

  it('should rename every segment of the speaker (ex.: Falante 1 → Cliente – João)', () => {
    const renamed = renameSpeaker(base(), 'Falante 1', 'Cliente – João');
    expect(renamed.map((s) => s.speaker)).toEqual(['Cliente – João', 'Falante 2', 'Cliente – João']);
    expect(distinctSpeakers(renamed)).toEqual(['Cliente – João', 'Falante 2']);
  });

  it('should leave segments unchanged when the speaker does not exist', () => {
    const segments = base();
    expect(renameSpeaker(segments, 'Falante 9', 'X')).toEqual(segments);
  });

  it('should reject an empty new name', () => {
    expect(() => renameSpeaker(base(), 'Falante 1', '  ')).toThrow();
  });

  it('should not mutate the original segments (pure function)', () => {
    const segments = base();
    renameSpeaker(segments, 'Falante 1', 'Cliente');
    expect(segments.map((s) => s.speaker)).toEqual(['Falante 1', 'Falante 2', 'Falante 1']);
  });
});
