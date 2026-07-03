import { createTestDatabase } from '../helpers/node-sqlite-database';
import { migrate } from '../../src/db/migrations';
import { MeetingRepository, type MeetingRecord } from '../../src/db/repository/meeting-repository';
import { TranscriptRepository } from '../../src/db/repository/transcript-repository';
import { PointRepository } from '../../src/db/repository/point-repository';
import { ArtifactRepository } from '../../src/db/repository/artifact-repository';
import { RefinementQueueRepository } from '../../src/db/repository/refinement-queue-repository';
import type { SqlDatabase } from '../../src/db/database';

const meeting = (id: string, title = 'Reunião de requisitos'): MeetingRecord => ({
  id,
  title,
  typeId: 'requirements-elicitation',
  status: 'idle',
  consentConfirmed: true,
  createdAt: '2026-07-03T10:00:00.000Z',
  audioSegments: [],
});

describe('repositories CRUD + cascade delete (TEST-10)', () => {
  let db: SqlDatabase;
  let meetings: MeetingRepository;
  let transcripts: TranscriptRepository;
  let points: PointRepository;
  let artifacts: ArtifactRepository;
  let queue: RefinementQueueRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
    meetings = new MeetingRepository(db);
    transcripts = new TranscriptRepository(db);
    points = new PointRepository(db);
    artifacts = new ArtifactRepository(db);
    queue = new RefinementQueueRepository(db);
  });

  it('should apply migrations idempotently (re-running migrate is a no-op)', async () => {
    await expect(migrate(db)).resolves.not.toThrow();
  });

  it('should save and load a meeting with audio segments round-tripped', async () => {
    const m = { ...meeting('m1'), audioSegments: ['a.m4a', 'b.m4a'], status: 'paused' as const };
    await meetings.save(m);
    const loaded = await meetings.findById('m1');
    expect(loaded).toEqual(m);
  });

  it('should return null for a missing meeting', async () => {
    expect(await meetings.findById('nope')).toBeNull();
  });

  it('should update a meeting on re-save (upsert)', async () => {
    await meetings.save(meeting('m1'));
    await meetings.save({ ...meeting('m1'), status: 'ended', audioSegments: ['x.m4a'] });
    const loaded = await meetings.findById('m1');
    expect(loaded?.status).toBe('ended');
    expect(loaded?.audioSegments).toEqual(['x.m4a']);
  });

  it('should list meetings newest first and search by title (case-insensitive)', async () => {
    await meetings.save({ ...meeting('m1', 'Kickoff CRM'), createdAt: '2026-07-01T10:00:00.000Z' });
    await meetings.save({ ...meeting('m2', 'Retro sprint 3'), createdAt: '2026-07-02T10:00:00.000Z' });
    const all = await meetings.list();
    expect(all.map((m) => m.id)).toEqual(['m2', 'm1']);
    const found = await meetings.searchByTitle('crm');
    expect(found.map((m) => m.id)).toEqual(['m1']);
  });

  it('should persist transcript segments with kind and speaker', async () => {
    await meetings.save(meeting('m1'));
    await transcripts.saveMany('m1', [
      { id: 't1', kind: 'draft', text: 'rascunho', startMs: 0, endMs: 1000 },
      { id: 't2', kind: 'final', text: 'refinado', startMs: 0, endMs: 1000, speaker: 'Falante 1' },
    ]);
    const loaded = await transcripts.listByMeeting('m1');
    expect(loaded).toHaveLength(2);
    expect(loaded.find((s) => s.id === 't2')?.speaker).toBe('Falante 1');
    expect(loaded.find((s) => s.id === 't1')?.speaker).toBeUndefined();
  });

  it('should replace all segments of a kind (refinamento substitui a base final)', async () => {
    await meetings.save(meeting('m1'));
    await transcripts.saveMany('m1', [
      { id: 't1', kind: 'final', text: 'velho', startMs: 0, endMs: 1000 },
      { id: 'd1', kind: 'draft', text: 'rascunho fica', startMs: 0, endMs: 1000 },
    ]);
    await transcripts.replaceKind('m1', 'final', [
      { id: 't2', kind: 'final', text: 'novo', startMs: 0, endMs: 1000, speaker: 'Falante 1' },
    ]);
    const loaded = await transcripts.listByMeeting('m1');
    expect(loaded.map((s) => s.id).sort()).toEqual(['d1', 't2']);
  });

  it('should persist extracted points with anchors', async () => {
    await meetings.save(meeting('m1'));
    await points.save('m1', {
      id: 'p1',
      sectionId: 'problem',
      text: 'Atas manuais são lentas',
      anchor: { segmentId: 't1', quote: 'muito lento' },
    });
    const loaded = await points.listByMeeting('m1');
    expect(loaded).toEqual([
      {
        id: 'p1',
        sectionId: 'problem',
        text: 'Atas manuais são lentas',
        anchor: { segmentId: 't1', quote: 'muito lento' },
      },
    ]);
  });

  it('should delete a point and upsert edits', async () => {
    await meetings.save(meeting('m1'));
    const p = { id: 'p1', sectionId: 'problem', text: 'v1', anchor: { segmentId: 't1', quote: 'q' } };
    await points.save('m1', p);
    await points.save('m1', { ...p, text: 'v2', sectionId: 'risks' });
    expect((await points.listByMeeting('m1'))[0]).toMatchObject({ text: 'v2', sectionId: 'risks' });
    await points.delete('p1');
    expect(await points.listByMeeting('m1')).toEqual([]);
  });

  it('should persist artifacts by kind', async () => {
    await meetings.save(meeting('m1'));
    await artifacts.save('m1', 'minutes', '# Ata', '2026-07-03T12:00:00.000Z');
    await artifacts.save('m1', 'requirements', '# Requisitos', '2026-07-03T12:00:00.000Z');
    expect((await artifacts.findByMeetingAndKind('m1', 'minutes'))?.markdown).toBe('# Ata');
    expect((await artifacts.findByMeetingAndKind('m1', 'requirements'))?.markdown).toBe('# Requisitos');
    // regenerar substitui (renomear falante → novo artefato)
    await artifacts.save('m1', 'minutes', '# Ata v2', '2026-07-03T13:00:00.000Z');
    expect((await artifacts.findByMeetingAndKind('m1', 'minutes'))?.markdown).toBe('# Ata v2');
  });

  it('should manage the refinement queue (enqueue, pending, failure, remove)', async () => {
    await meetings.save(meeting('m1'));
    await queue.enqueue('m1', '2026-07-03T12:00:00.000Z');
    await queue.enqueue('m1', '2026-07-03T12:05:00.000Z'); // idempotente
    let pending = await queue.pending();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ meetingId: 'm1', attempts: 0 });
    await queue.recordFailure('m1', 'network down');
    pending = await queue.pending();
    expect(pending[0]).toMatchObject({ attempts: 1, lastError: 'network down' });
    await queue.remove('m1');
    expect(await queue.pending()).toEqual([]);
  });

  it('should cascade-delete transcripts, points, artifacts and queue rows with the meeting (REQ-10)', async () => {
    await meetings.save(meeting('m1'));
    await transcripts.saveMany('m1', [{ id: 't1', kind: 'draft', text: 'x', startMs: 0, endMs: 1 }]);
    await points.save('m1', { id: 'p1', sectionId: 's', text: 'x', anchor: { segmentId: 't1', quote: 'x' } });
    await artifacts.save('m1', 'minutes', '# Ata', '2026-07-03T12:00:00.000Z');
    await queue.enqueue('m1', '2026-07-03T12:00:00.000Z');

    await meetings.delete('m1');

    expect(await meetings.findById('m1')).toBeNull();
    expect(await transcripts.listByMeeting('m1')).toEqual([]);
    expect(await points.listByMeeting('m1')).toEqual([]);
    expect(await artifacts.findByMeetingAndKind('m1', 'minutes')).toBeNull();
    expect(await queue.pending()).toEqual([]);
  });
});
