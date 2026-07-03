import { createTestDatabase } from '../helpers/node-sqlite-database';
import { migrate } from '../../src/db/migrations';
import { MeetingRepository } from '../../src/db/repository/meeting-repository';
import { TranscriptRepository } from '../../src/db/repository/transcript-repository';
import { PointRepository } from '../../src/db/repository/point-repository';
import { ArtifactRepository } from '../../src/db/repository/artifact-repository';
import { RefinementQueueRepository } from '../../src/db/repository/refinement-queue-repository';
import { RefinementService } from '../../src/services/refinement-service';
import type { SttBatchProvider } from '../../src/adapters/provider-ports';
import type { SqlDatabase } from '../../src/db/database';

const okProvider: SttBatchProvider = {
  id: 'fake-stt',
  supportsDiarization: true,
  async transcribe() {
    return [
      { text: 'precisamos gravar as reuniões', startMs: 0, endMs: 2000, speaker: 'Falante 1' },
      { text: 'e exportar a ata em markdown', startMs: 2000, endMs: 4000, speaker: 'Falante 2' },
    ];
  },
};

const failingProvider: SttBatchProvider = {
  id: 'fake-stt',
  supportsDiarization: true,
  async transcribe() {
    throw new Error('network down');
  },
};

async function seedEndedMeeting(db: SqlDatabase, id = 'm1') {
  const meetings = new MeetingRepository(db);
  const queue = new RefinementQueueRepository(db);
  await meetings.save({
    id,
    title: 'Kickoff',
    typeId: 'requirements-elicitation',
    status: 'ended',
    consentConfirmed: true,
    createdAt: '2026-07-03T10:00:00.000Z',
    audioSegments: ['seg-001.m4a'],
  });
  await new TranscriptRepository(db).saveMany(id, [
    { id: 'd1', kind: 'draft', text: 'rascunho ao vivo', startMs: 0, endMs: 1000 },
  ]);
  await queue.enqueue(id, '2026-07-03T12:00:00.000Z');
}

function makeService(db: SqlDatabase, provider: SttBatchProvider) {
  return new RefinementService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    artifacts: new ArtifactRepository(db),
    queue: new RefinementQueueRepository(db),
    provider,
    clock: { nowIso: () => '2026-07-03T12:30:00.000Z' },
    ids: { newId: (() => { let n = 0; return () => `gen-${++n}`; })() },
  });
}

describe('refinement queue offline-first (TEST-11)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
    await seedEndedMeeting(db);
  });

  it('should keep the meeting queued and intact when the provider fails (NFR-06)', async () => {
    const service = makeService(db, failingProvider);
    const result = await service.processQueue();
    expect(result).toEqual([{ meetingId: 'm1', ok: false, error: 'network down' }]);

    const pending = await new RefinementQueueRepository(db).pending();
    expect(pending[0]).toMatchObject({ meetingId: 'm1', attempts: 1, lastError: 'network down' });
    // sessão volta para ended — pode re-tentar depois; rascunho preservado
    expect((await new MeetingRepository(db).findById('m1'))?.status).toBe('ended');
    expect(await new TranscriptRepository(db).listByMeeting('m1')).toHaveLength(1);
  });

  it('should refine, generate artifacts and dequeue on success (REQ-03/06/07/12)', async () => {
    const service = makeService(db, okProvider);
    const result = await service.processQueue();
    expect(result).toEqual([{ meetingId: 'm1', ok: true }]);

    // transcrição final substituiu a base, com falantes (REQ-12)
    const segments = await new TranscriptRepository(db).listByMeeting('m1');
    const finals = segments.filter((s) => s.kind === 'final');
    expect(finals).toHaveLength(2);
    expect(finals.map((s) => s.speaker)).toEqual(['Falante 1', 'Falante 2']);

    // artefatos gerados: ata + requisitos (tipo requirements-elicitation)
    const artifacts = new ArtifactRepository(db);
    const minutes = await artifacts.findByMeetingAndKind('m1', 'minutes');
    const requirements = await artifacts.findByMeetingAndKind('m1', 'requirements');
    expect(minutes?.markdown).toContain('Kickoff');
    expect(requirements?.markdown).toContain('## Open Questions');

    // fila vazia, status final
    expect(await new RefinementQueueRepository(db).pending()).toEqual([]);
    expect((await new MeetingRepository(db).findById('m1'))?.status).toBe('done');
  });

  it('should generate only minutes for a minutes-only meeting type (REQ-08)', async () => {
    const meetings = new MeetingRepository(db);
    const m = await meetings.findById('m1');
    await meetings.save({ ...m!, typeId: 'generic-meeting' });

    await makeService(db, okProvider).processQueue();

    const artifacts = new ArtifactRepository(db);
    expect(await artifacts.findByMeetingAndKind('m1', 'minutes')).not.toBeNull();
    expect(await artifacts.findByMeetingAndKind('m1', 'requirements')).toBeNull();
  });

  it('should succeed on retry after a failure (fila retém e re-processa)', async () => {
    await makeService(db, failingProvider).processQueue();
    const result = await makeService(db, okProvider).processQueue();
    expect(result).toEqual([{ meetingId: 'm1', ok: true }]);
    expect(await new RefinementQueueRepository(db).pending()).toEqual([]);
  });

  it('should include extracted points in the generated artifacts', async () => {
    await new PointRepository(db).save('m1', {
      id: 'p1',
      sectionId: 'problem',
      text: 'Atas manuais perdem informação',
      anchor: { segmentId: 'd1', quote: 'rascunho ao vivo' },
    });
    await makeService(db, okProvider).processQueue();
    const minutes = await new ArtifactRepository(db).findByMeetingAndKind('m1', 'requirements');
    expect(minutes?.markdown).toContain('Atas manuais perdem informação');
  });

  it('should fail the queue item when the meeting type is unknown (dados corrompidos não travam a fila)', async () => {
    const meetings = new MeetingRepository(db);
    const m = await meetings.findById('m1');
    await meetings.save({ ...m!, typeId: 'tipo-que-nao-existe' });
    const result = await makeService(db, okProvider).processQueue();
    expect(result[0]).toMatchObject({ meetingId: 'm1', ok: false });
    expect((await new RefinementQueueRepository(db).pending())[0]?.attempts).toBe(1);
  });
});
