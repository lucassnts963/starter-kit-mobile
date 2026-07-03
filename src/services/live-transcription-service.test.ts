import { createTestDatabase } from '../../tests/helpers/node-sqlite-database';
import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import { MeetingSessionService } from './meeting-session-service';
import { LiveTranscriptionService } from './live-transcription-service';
import type { SpeechRecognizerPort, SpeechRecognizerCallbacks } from './recording-ports';
import type { SqlDatabase } from '../db/database';

function fakeRecognizer(available = true) {
  const startCalls: { language: string }[] = [];
  let callbacks: SpeechRecognizerCallbacks | null = null;
  let stopped = 0;
  const recognizer: SpeechRecognizerPort = {
    async available() {
      return available;
    },
    async start(options, cbs) {
      startCalls.push(options);
      callbacks = cbs;
    },
    async stop() {
      stopped += 1;
    },
  };
  return {
    recognizer,
    startCalls,
    fire: () => callbacks!,
    stops: () => stopped,
  };
}

async function makeServices(db: SqlDatabase, recognizer: SpeechRecognizerPort) {
  await migrate(db);
  let n = 0;
  let ms = 0;
  const session = new MeetingSessionService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    queue: new RefinementQueueRepository(db),
    clock: { nowIso: () => '2026-07-03T12:00:00.000Z' },
    ids: { newId: () => `id-${++n}` },
    files: { deleteFiles: async () => undefined, persist: async (uri: string) => uri },
  });
  const meeting = await session.createMeeting('Kickoff', 'requirements-elicitation', true);
  await session.start(meeting.id);
  const live = new LiveTranscriptionService({
    session,
    recognizer,
    monotonic: { nowMs: () => (ms += 1000) },
    ids: { newId: () => `t-${++n}` },
  });
  return { live, meeting };
}

describe('live transcription auto-restart (TEST-24, REQ-02)', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('should persist final recognizer results as draft segments with increasing timestamps', async () => {
    const fake = fakeRecognizer();
    const { live, meeting } = await makeServices(db, fake.recognizer);

    const started = await live.start(meeting.id, 'pt-BR');
    expect(started).toEqual({ ok: true });
    expect(fake.startCalls[0]).toEqual({ language: 'pt-BR' });

    fake.fire().onResult({ text: 'primeiro trecho', isFinal: true });
    fake.fire().onResult({ text: 'parcial ignorado', isFinal: false });
    fake.fire().onResult({ text: 'segundo trecho', isFinal: true });
    await live.flush();

    const segments = await new TranscriptRepository(db).listByMeeting(meeting.id);
    expect(segments.map((s) => ({ text: s.text, kind: s.kind }))).toEqual([
      { text: 'primeiro trecho', kind: 'draft' },
      { text: 'segundo trecho', kind: 'draft' },
    ]);
    expect(segments[1]!.startMs).toBeGreaterThan(segments[0]!.startMs);
  });

  it('should auto-restart when the native session ends (limite ~1min do iOS / silêncio)', async () => {
    const fake = fakeRecognizer();
    const { live, meeting } = await makeServices(db, fake.recognizer);
    await live.start(meeting.id, 'pt-BR');

    fake.fire().onEnd();
    await live.flush();
    fake.fire().onEnd();
    await live.flush();

    expect(fake.startCalls).toHaveLength(3); // inicial + 2 reinícios
  });

  it('should not restart after an explicit stop', async () => {
    const fake = fakeRecognizer();
    const { live, meeting } = await makeServices(db, fake.recognizer);
    await live.start(meeting.id, 'pt-BR');

    await live.stop(meeting.id);
    fake.fire().onEnd();
    await live.flush();

    expect(fake.startCalls).toHaveLength(1);
    expect(fake.stops()).toBe(1);
  });

  it('should degrade to recording-only on recognizer error without stopping the session (NFR-06)', async () => {
    const fake = fakeRecognizer();
    const { live, meeting } = await makeServices(db, fake.recognizer);
    await live.start(meeting.id, 'pt-BR');

    fake.fire().onError('reconhecimento indisponível');
    await live.flush();

    expect(live.status(meeting.id)).toEqual({ active: false, degraded: true, reason: 'reconhecimento indisponível' });
    // a sessão de gravação continua intocada
    expect((await new MeetingRepository(db).findById(meeting.id))?.status).toBe('recording');
    // e não há reinício automático após erro
    expect(fake.startCalls).toHaveLength(1);
  });

  it('should return ok=false and stay recording-only when native STT is unavailable', async () => {
    const fake = fakeRecognizer(false);
    const { live, meeting } = await makeServices(db, fake.recognizer);

    const started = await live.start(meeting.id, 'pt-BR');

    expect(started).toEqual({ ok: false, reason: 'stt-indisponivel' });
    expect(fake.startCalls).toHaveLength(0);
    expect(live.status(meeting.id)).toEqual({ active: false, degraded: true, reason: 'stt-indisponivel' });
  });
});
