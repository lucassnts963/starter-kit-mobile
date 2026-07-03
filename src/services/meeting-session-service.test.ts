import { createTestDatabase } from '../../tests/helpers/node-sqlite-database';
import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import { MeetingSessionService } from './meeting-session-service';
import { AnchorError } from '../domain/extracted-point';
import type { SqlDatabase } from '../db/database';

function makeService(db: SqlDatabase) {
  let n = 0;
  const deletedFiles: string[] = [];
  const service = new MeetingSessionService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    queue: new RefinementQueueRepository(db),
    clock: { nowIso: () => '2026-07-03T12:00:00.000Z' },
    ids: { newId: () => `id-${++n}` },
    files: {
      deleteFiles: async (paths: string[]) => {
        deletedFiles.push(...paths);
      },
      persist: async (uri: string) => uri,
    },
  });
  return { service, deletedFiles };
}

describe('meeting session service persistence (TEST-19)', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
  });

  it('should create a meeting persisted as idle with generated id', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    expect(m).toMatchObject({ id: 'id-1', status: 'idle', consentConfirmed: true });
    expect((await new MeetingRepository(db).findById('id-1'))?.title).toBe('Kickoff');
  });

  it('should persist status across start/pause/resume transitions', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await service.start(m.id);
    expect((await new MeetingRepository(db).findById(m.id))?.status).toBe('recording');
    await service.pause(m.id);
    expect((await new MeetingRepository(db).findById(m.id))?.status).toBe('paused');
    await service.resume(m.id);
    expect((await new MeetingRepository(db).findById(m.id))?.status).toBe('recording');
  });

  it('should reject invalid transitions using the domain state machine', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await expect(service.pause(m.id)).rejects.toThrow(); // idle não pausa
  });

  it('should persist audio segments and draft transcript during the session', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await service.start(m.id);
    await service.addAudioSegment(m.id, 'seg-001.m4a');
    await service.addDraftSegment(m.id, { id: 't1', kind: 'draft', text: 'olá', startMs: 0, endMs: 900 });
    expect((await new MeetingRepository(db).findById(m.id))?.audioSegments).toEqual(['seg-001.m4a']);
    expect(await new TranscriptRepository(db).listByMeeting(m.id)).toHaveLength(1);
  });

  it('should accept an anchored point and reject an unanchored one before saving (REQ-05)', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await service.start(m.id);
    await service.addDraftSegment(m.id, {
      id: 't1',
      kind: 'draft',
      text: 'precisamos gravar as reuniões',
      startMs: 0,
      endMs: 900,
    });

    await service.addPoint(m.id, {
      sectionId: 'functional-requirements',
      text: 'Gravar reuniões',
      anchor: { segmentId: 't1', quote: 'gravar as reuniões' },
    });
    expect(await new PointRepository(db).listByMeeting(m.id)).toHaveLength(1);

    await expect(
      service.addPoint(m.id, {
        sectionId: 'risks',
        text: 'Inventado',
        anchor: { segmentId: 't1', quote: 'sincronizar com a nuvem' },
      }),
    ).rejects.toThrow(AnchorError);
    expect(await new PointRepository(db).listByMeeting(m.id)).toHaveLength(1);
  });

  it('should end the meeting and enqueue refinement (REQ-03)', async () => {
    const { service } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await service.start(m.id);
    await service.end(m.id);
    expect((await new MeetingRepository(db).findById(m.id))?.status).toBe('ended');
    const pending = await new RefinementQueueRepository(db).pending();
    expect(pending.map((q) => q.meetingId)).toEqual([m.id]);
  });
});

describe('deep delete removes data and audio (TEST-20, REQ-10)', () => {
  it('should delete DB rows in cascade and audio files via the file port', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const { service, deletedFiles } = makeService(db);
    const m = await service.createMeeting('Kickoff', 'requirements-elicitation', true);
    await service.start(m.id);
    await service.addAudioSegment(m.id, 'seg-001.m4a');
    await service.addAudioSegment(m.id, 'seg-002.m4a');
    await service.addDraftSegment(m.id, { id: 't1', kind: 'draft', text: 'x', startMs: 0, endMs: 1 });

    await service.deleteMeeting(m.id);

    expect(deletedFiles.sort()).toEqual(['seg-001.m4a', 'seg-002.m4a']);
    expect(await new MeetingRepository(db).findById(m.id)).toBeNull();
    expect(await new TranscriptRepository(db).listByMeeting(m.id)).toEqual([]);
  });

  it('should fail loudly when deleting a meeting that does not exist', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const { service } = makeService(db);
    await expect(service.deleteMeeting('nope')).rejects.toThrow();
  });
});
