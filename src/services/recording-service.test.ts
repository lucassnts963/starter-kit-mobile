import { createTestDatabase } from '../../tests/helpers/node-sqlite-database';
import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import { MeetingSessionService } from './meeting-session-service';
import { RecordingService } from './recording-service';
import type { RecorderPort } from './recording-ports';
import type { SqlDatabase } from '../db/database';

function fakeRecorder() {
  let n = 0;
  let recording = false;
  const calls: string[] = [];
  const recorder: RecorderPort = {
    async start() {
      recording = true;
      calls.push('start');
    },
    async stop() {
      recording = false;
      calls.push('stop');
      return `seg-${String(++n).padStart(3, '0')}.m4a`;
    },
  };
  return { recorder, calls, isRecording: () => recording };
}

async function makeServices(db: SqlDatabase, recorder: RecorderPort) {
  await migrate(db);
  let n = 0;
  const session = new MeetingSessionService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    queue: new RefinementQueueRepository(db),
    clock: { nowIso: () => '2026-07-03T12:00:00.000Z' },
    ids: { newId: () => `id-${++n}` },
    files: { deleteFiles: async () => undefined },
  });
  const meeting = await session.createMeeting('Kickoff', 'requirements-elicitation', true);
  return { session, recording: new RecordingService({ session, recorder }), meeting };
}

describe('segmented recording orchestration (TEST-23, REQ-01)', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('should record one segment per pause/resume cycle, persisted in order', async () => {
    const { recorder } = { recorder: undefined };
    const fake = fakeRecorder();
    const { recording, meeting } = await makeServices(db, fake.recorder);

    await recording.start(meeting.id);
    await recording.pause(meeting.id);
    await recording.resume(meeting.id);
    await recording.stop(meeting.id);

    const saved = await new MeetingRepository(db).findById(meeting.id);
    expect(saved?.audioSegments).toEqual(['seg-001.m4a', 'seg-002.m4a']);
    expect(saved?.status).toBe('ended');
    expect(fake.calls).toEqual(['start', 'stop', 'start', 'stop']);
    void recorder;
  });

  it('should keep session status in sync while recording and paused', async () => {
    const fake = fakeRecorder();
    const { recording, meeting } = await makeServices(db, fake.recorder);
    const meetings = new MeetingRepository(db);

    await recording.start(meeting.id);
    expect((await meetings.findById(meeting.id))?.status).toBe('recording');
    await recording.pause(meeting.id);
    expect((await meetings.findById(meeting.id))?.status).toBe('paused');
  });

  it('should enqueue refinement when the recording stops', async () => {
    const fake = fakeRecorder();
    const { recording, meeting } = await makeServices(db, fake.recorder);
    await recording.start(meeting.id);
    await recording.stop(meeting.id);
    const pending = await new RefinementQueueRepository(db).pending();
    expect(pending.map((q) => q.meetingId)).toEqual([meeting.id]);
  });

  it('should not transition the session when the recorder fails to start (permissão negada)', async () => {
    const failing: RecorderPort = {
      async start() {
        throw new Error('microfone negado');
      },
      async stop() {
        return 'x.m4a';
      },
    };
    const { recording, meeting } = await makeServices(db, failing);

    await expect(recording.start(meeting.id)).rejects.toThrow('microfone negado');
    expect((await new MeetingRepository(db).findById(meeting.id))?.status).toBe('idle');
  });

  it('should still end the session preserving segments when the recorder fails on stop', async () => {
    const fake = fakeRecorder();
    let stopCount = 0;
    const flaky: RecorderPort = {
      start: fake.recorder.start,
      async stop() {
        stopCount += 1;
        if (stopCount === 2) throw new Error('gravador travou');
        return fake.recorder.stop();
      },
    };
    const { recording, meeting } = await makeServices(db, flaky);

    await recording.start(meeting.id);
    await recording.pause(meeting.id); // seg-001 persistido
    await recording.resume(meeting.id);
    await recording.stop(meeting.id); // stop do gravador falha, mas a sessão encerra

    const saved = await new MeetingRepository(db).findById(meeting.id);
    expect(saved?.status).toBe('ended');
    expect(saved?.audioSegments).toEqual(['seg-001.m4a']); // o que já existia foi preservado
  });
});

describe('importing an already-recorded audio file (REQ-01 amendment: import)', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('should register the picked file as the single audio segment and end the session, without touching the recorder', async () => {
    const fake = fakeRecorder();
    const { recording, meeting } = await makeServices(db, fake.recorder);

    await recording.importAudio(meeting.id, 'content://downloads/reuniao-01.m4a');

    const saved = await new MeetingRepository(db).findById(meeting.id);
    expect(saved?.audioSegments).toEqual(['content://downloads/reuniao-01.m4a']);
    expect(saved?.status).toBe('ended');
    expect(fake.calls).toEqual([]); // não usa o microfone/gravador nativo
  });

  it('should enqueue refinement, same as a live recording', async () => {
    const fake = fakeRecorder();
    const { recording, meeting } = await makeServices(db, fake.recorder);

    await recording.importAudio(meeting.id, 'content://downloads/reuniao-01.m4a');

    const pending = await new RefinementQueueRepository(db).pending();
    expect(pending.map((q) => q.meetingId)).toEqual([meeting.id]);
  });
});
