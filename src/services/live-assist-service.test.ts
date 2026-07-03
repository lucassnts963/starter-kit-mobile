import { createTestDatabase } from '../../tests/helpers/node-sqlite-database';
import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { LiveAssistService } from './live-assist-service';
import { parseMeetingType } from '../domain/meeting-type';
import type { LlmProvider, LlmPointCandidate } from '../adapters/provider-ports';
import type { SqlDatabase } from '../db/database';

const type = parseMeetingType({
  id: 'mini',
  name: 'Mini levantamento',
  output: 'minutes+requirements',
  sections: [
    { id: 'problem', title: 'Problema', questions: ['Qual é o problema?'] },
    { id: 'risks', title: 'Riscos', questions: ['O que pode dar errado?'] },
  ],
});

function llmReturning(candidates: LlmPointCandidate[]): LlmProvider {
  return { id: 'fake-llm', extractPoints: jest.fn(async () => candidates) };
}

const failingLlm: LlmProvider = {
  id: 'fake-llm',
  extractPoints: async () => {
    throw new Error('llm indisponível');
  },
};

async function setup(db: SqlDatabase) {
  await migrate(db);
  await new MeetingRepository(db).save({
    id: 'm1',
    title: 'Kickoff',
    typeId: 'mini',
    status: 'recording',
    consentConfirmed: true,
    createdAt: '2026-07-03T10:00:00.000Z',
    audioSegments: [],
  });
  const transcripts = new TranscriptRepository(db);
  await transcripts.saveMany('m1', [
    { id: 't1', kind: 'draft', text: 'nosso problema é perder requisitos em reunião', startMs: 0, endMs: 2000 },
  ]);
  return { transcripts, points: new PointRepository(db) };
}

describe('live assist extraction loop (TEST-22, TEST-12)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
  });

  it('should save anchored candidates and drop hallucinated ones (REQ-05)', async () => {
    const { points } = await setup(db);
    const llm = llmReturning([
      {
        sectionId: 'problem',
        text: 'Requisitos se perdem em reunião',
        anchor: { segmentId: 't1', quote: 'perder requisitos em reunião' },
      },
      {
        sectionId: 'risks',
        text: 'Inventado pelo LLM',
        anchor: { segmentId: 't1', quote: 'frase que não existe na transcrição' },
      },
    ]);
    const service = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points,
      llm,
      ids: { newId: (() => { let n = 0; return () => `p-${++n}`; })() },
    });

    const result = await service.processDelta('m1', type);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.added).toHaveLength(1);
      expect(result.added[0]).toMatchObject({ sectionId: 'problem' });
      expect(result.dropped).toBe(1);
    }
    expect(await points.listByMeeting('m1')).toHaveLength(1);
  });

  it('should report coverage and suggest questions only for pending sections (REQ-04)', async () => {
    await setup(db);
    const llm = llmReturning([
      { sectionId: 'problem', text: 'Perda de requisitos', anchor: { segmentId: 't1', quote: 'perder requisitos' } },
    ]);
    const service = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points: new PointRepository(db),
      llm,
      ids: { newId: () => 'p-1' },
    });

    const result = await service.processDelta('m1', type);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coverage.covered).toEqual(['problem']);
      expect(result.coverage.pending).toEqual(['risks']);
      expect(result.suggestions.map((s) => s.sectionId)).toEqual(['risks']);
    }
  });

  it('should only send new segments to the LLM on subsequent calls (delta processing)', async () => {
    const { transcripts } = await setup(db);
    const llm = llmReturning([]);
    const service = new LiveAssistService({
      transcripts,
      points: new PointRepository(db),
      llm,
      ids: { newId: () => 'p-1' },
    });

    await service.processDelta('m1', type);
    const firstCall = (llm.extractPoints as jest.Mock).mock.calls[0][0];
    expect(firstCall.transcript.map((s: { segmentId: string }) => s.segmentId)).toEqual(['t1']);

    await transcripts.saveMany('m1', [
      { id: 't2', kind: 'draft', text: 'novo trecho', startMs: 2000, endMs: 3000 },
    ]);
    await service.processDelta('m1', type);
    const secondCall = (llm.extractPoints as jest.Mock).mock.calls[1][0];
    expect(secondCall.transcript.map((s: { segmentId: string }) => s.segmentId)).toEqual(['t2']);
  });

  it('should skip the LLM entirely when there is no new transcript', async () => {
    await setup(db);
    const llm = llmReturning([]);
    const service = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points: new PointRepository(db),
      llm,
      ids: { newId: () => 'p-1' },
    });

    await service.processDelta('m1', type);
    await service.processDelta('m1', type); // nada novo
    expect(llm.extractPoints).toHaveBeenCalledTimes(1);
  });

  it('should stringify non-Error throwables from misbehaving providers', async () => {
    await setup(db);
    const weirdLlm: LlmProvider = {
      id: 'fake-llm',
      extractPoints: async () => {
        throw 'string crua';
      },
    };
    const service = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points: new PointRepository(db),
      llm: weirdLlm,
      ids: { newId: () => 'p-1' },
    });
    expect(await service.processDelta('m1', type)).toEqual({ ok: false, error: 'string crua' });
  });

  it('should degrade to recording-only on LLM failure: ok=false, no exception, nothing saved (TEST-12, NFR-06)', async () => {
    const { points } = await setup(db);
    const service = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points,
      llm: failingLlm,
      ids: { newId: () => 'p-1' },
    });

    const result = await service.processDelta('m1', type);

    expect(result).toEqual({ ok: false, error: 'llm indisponível' });
    expect(await points.listByMeeting('m1')).toEqual([]);

    // o delta não foi consumido — a próxima chamada re-tenta o mesmo trecho
    const retryLlm = llmReturning([]);
    const retryService = new LiveAssistService({
      transcripts: new TranscriptRepository(db),
      points,
      llm: retryLlm,
      ids: { newId: () => 'p-1' },
    });
    await retryService.processDelta('m1', type);
    expect(retryLlm.extractPoints).toHaveBeenCalled();
  });
});
