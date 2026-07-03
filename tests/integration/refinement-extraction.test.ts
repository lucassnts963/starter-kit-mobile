import { createTestDatabase } from '../helpers/node-sqlite-database';
import { migrate } from '../../src/db/migrations';
import { MeetingRepository } from '../../src/db/repository/meeting-repository';
import { TranscriptRepository } from '../../src/db/repository/transcript-repository';
import { PointRepository } from '../../src/db/repository/point-repository';
import { ArtifactRepository } from '../../src/db/repository/artifact-repository';
import { RefinementQueueRepository } from '../../src/db/repository/refinement-queue-repository';
import { RefinementService } from '../../src/services/refinement-service';
import { LOCAL_DRAFT_STT_ID, type LlmProvider, type SttBatchProvider } from '../../src/adapters/provider-ports';
import type { SqlDatabase } from '../../src/db/database';

/** STT fake que conta chamadas — pra provar quando o refinamento NÃO gasta créditos de transcrição. */
function countingProvider() {
  let calls = 0;
  const provider: SttBatchProvider = {
    id: 'fake-stt',
    supportsDiarization: true,
    async transcribe() {
      calls += 1;
      return [
        { text: 'o problema é perder requisitos em reunião', startMs: 0, endMs: 2000, speaker: 'Falante 1' },
        { text: 'os stakeholders são o time de vendas', startMs: 2000, endMs: 4000, speaker: 'Falante 2' },
      ];
    },
  };
  return { provider, callCount: () => calls };
}

/** LLM fake que ancora no primeiro segmento recebido (como um LLM real obediente faria). */
function anchoredLlm() {
  let calls = 0;
  const llm: LlmProvider = {
    id: 'fake-llm',
    async extractPoints(input) {
      calls += 1;
      const first = input.transcript[0]!;
      return [
        {
          sectionId: 'problem',
          text: 'Requisitos se perdem em reunião',
          anchor: { segmentId: first.segmentId, quote: 'perder requisitos' },
        },
        {
          // âncora inventada — deve ser descartada pela validação anti-alucinação
          sectionId: 'risks',
          text: 'Ponto alucinado',
          anchor: { segmentId: 'nao-existe', quote: 'nunca dito' },
        },
      ];
    },
  };
  return { llm, callCount: () => calls };
}

async function seedImportedMeeting(db: SqlDatabase, id = 'm1') {
  // reunião importada: áudio existe, mas NUNCA houve sessão ao vivo (sem rascunho, sem pontos)
  await new MeetingRepository(db).save({
    id,
    title: 'Reunião importada',
    typeId: 'requirements-elicitation',
    status: 'ended',
    consentConfirmed: true,
    createdAt: '2026-07-03T10:00:00.000Z',
    audioSegments: ['importado.m4a'],
  });
  await new RefinementQueueRepository(db).enqueue(id, '2026-07-03T12:00:00.000Z');
}

function makeService(db: SqlDatabase, provider: SttBatchProvider, llm?: LlmProvider) {
  return new RefinementService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    artifacts: new ArtifactRepository(db),
    queue: new RefinementQueueRepository(db),
    provider,
    ...(llm ? { llm } : {}),
    clock: { nowIso: () => '2026-07-03T12:30:00.000Z' },
    ids: (() => { let n = 0; return { newId: () => `gen-${++n}` }; })(),
  });
}

describe('batch extraction during refinement (bugfix: ata/requisitos vazios em reunião importada)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
    await seedImportedMeeting(db);
  });

  it('should extract points from the final transcript when the meeting has none (imported/degraded)', async () => {
    const { provider } = countingProvider();
    const { llm } = anchoredLlm();
    const service = makeService(db, provider, llm);

    const result = (await service.processQueue())[0]!;
    expect(result).toEqual({ meetingId: 'm1', ok: true });

    const points = await new PointRepository(db).listByMeeting('m1');
    expect(points).toHaveLength(1); // o alucinado foi descartado
    expect(points[0]).toMatchObject({ sectionId: 'problem', text: 'Requisitos se perdem em reunião' });

    const minutes = await new ArtifactRepository(db).findByMeetingAndKind('m1', 'minutes');
    expect(minutes?.markdown).toContain('Requisitos se perdem em reunião');
  });

  it('should NOT spend LLM tokens when live points already exist', async () => {
    await new TranscriptRepository(db).saveMany('m1', [
      { id: 'd1', kind: 'draft', text: 'rascunho com o problema anotado', startMs: 0, endMs: 1000 },
    ]);
    await new PointRepository(db).save('m1', {
      id: 'p1',
      sectionId: 'problem',
      text: 'Ponto do ao vivo',
      anchor: { segmentId: 'd1', quote: 'problema anotado' },
    });
    const { provider } = countingProvider();
    const { llm, callCount } = anchoredLlm();

    await makeService(db, provider, llm).processQueue();

    expect(callCount()).toBe(0);
    const minutes = await new ArtifactRepository(db).findByMeetingAndKind('m1', 'minutes');
    expect(minutes?.markdown).toContain('Ponto do ao vivo');
  });

  it('should still refine without an LLM configured (artefatos só com a estrutura)', async () => {
    const { provider } = countingProvider();
    const result = (await makeService(db, provider).processQueue())[0]!;
    expect(result.ok).toBe(true);
  });

  it('should reuse the existing final base on retry instead of re-transcribing (não gasta créditos de STT)', async () => {
    const { provider, callCount } = countingProvider();
    const failingLlm: LlmProvider = {
      id: 'fake-llm',
      async extractPoints() {
        throw new Error('llm fora do ar');
      },
    };
    const service = makeService(db, provider, failingLlm);

    const first = (await service.processQueue())[0]!;
    expect(first.ok).toBe(false);
    expect(callCount()).toBe(1); // transcreveu e persistiu a base final

    const { llm } = anchoredLlm();
    const retry = makeService(db, provider, llm);
    const second = (await retry.processQueue())[0]!;
    expect(second.ok).toBe(true);
    expect(callCount()).toBe(1); // retry NÃO re-transcreveu
  });
});

describe('regenerateArtifacts: re-roda só o passo do LLM, sem STT (economia de créditos)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
    await seedImportedMeeting(db);
  });

  it('should rebuild points and artifacts from the existing final base without calling the STT provider', async () => {
    const { provider, callCount } = countingProvider();
    const { llm } = anchoredLlm();
    const service = makeService(db, provider, llm);
    await service.processQueue(); // refinamento completo (1 transcrição)

    const result = await service.regenerateArtifacts('m1');
    expect(result).toEqual({ meetingId: 'm1', ok: true });
    expect(callCount()).toBe(1); // nenhuma transcrição extra

    // pontos foram substituídos (não duplicados) e artefatos regenerados
    const points = await new PointRepository(db).listByMeeting('m1');
    expect(points).toHaveLength(1);
    expect((await new MeetingRepository(db).findById('m1'))?.status).toBe('done');
  });

  it('should fail clearly when there is no final transcript yet', async () => {
    const { provider } = countingProvider();
    const { llm } = anchoredLlm();
    const result = await makeService(db, provider, llm).regenerateArtifacts('m1');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/final/i);
  });
});

describe('local draft STT (transcrição sem custo a partir do rascunho do aparelho)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
    await seedImportedMeeting(db);
  });

  const localProvider: SttBatchProvider = {
    id: LOCAL_DRAFT_STT_ID,
    supportsDiarization: false,
    async transcribe() {
      throw new Error('não deve ser chamado — a base vem do rascunho local');
    },
  };

  it('should promote the live draft to the final base without any network transcription', async () => {
    await new TranscriptRepository(db).saveMany('m1', [
      { id: 'd1', kind: 'draft', text: 'o problema é perder requisitos', startMs: 0, endMs: 1500 },
      { id: 'd2', kind: 'draft', text: 'os stakeholders são vendas', startMs: 1500, endMs: 3000 },
    ]);
    const { llm } = anchoredLlm();

    const result = (await makeService(db, localProvider, llm).processQueue())[0]!;
    expect(result).toEqual({ meetingId: 'm1', ok: true });

    const segments = await new TranscriptRepository(db).listByMeeting('m1');
    const finals = segments.filter((s) => s.kind === 'final');
    expect(finals.map((s) => s.text)).toEqual(['o problema é perder requisitos', 'os stakeholders são vendas']);
    expect(finals.every((s) => s.speaker === undefined)).toBe(true); // rascunho não diariza
  });

  it('should fail clearly for imported meetings that never had a live draft', async () => {
    const { llm } = anchoredLlm();
    const result = (await makeService(db, localProvider, llm).processQueue())[0]!;
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/rascunho/i);
  });
});
