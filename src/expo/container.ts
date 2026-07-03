import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { ArtifactRepository } from '../db/repository/artifact-repository';
import { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import { SettingsRepository } from '../db/repository/settings-repository';
import { MeetingSessionService } from '../services/meeting-session-service';
import { RefinementService } from '../services/refinement-service';
import { LiveAssistService } from '../services/live-assist-service';
import { RecordingService } from '../services/recording-service';
import { LiveTranscriptionService } from '../services/live-transcription-service';
import { SpeakerService } from '../services/speaker-service';
import { createSttProvider, createLlmProvider } from '../adapters/provider-catalog';
import type { HttpClient } from '../adapters/http';
import { openEscribaDatabase } from './expo-sqlite-database';
import { secureKeyStore } from './secure-key-store';
import { audioFileStore } from './audio-file-store';
import { createExpoRecorder } from './recorder-expo-audio';
import { createExpoSpeechRecognizer } from './speech-recognizer-expo';

/** Composition root do app (hooks consomem via ServicesContext em app/_layout). */
export interface AppContainer {
  meetings: MeetingRepository;
  transcripts: TranscriptRepository;
  points: PointRepository;
  artifacts: ArtifactRepository;
  settings: SettingsRepository;
  session: MeetingSessionService;
  recording: RecordingService;
  liveTranscription: LiveTranscriptionService;
  speakers: SpeakerService;
  /** Resolvidos por chamada, respeitando o provedor selecionado nas configurações. */
  createLiveAssist(): Promise<LiveAssistService>;
  createRefinement(): Promise<RefinementService>;
}

const http: HttpClient = (url, init) => fetch(url, init as RequestInit);

const clock = { nowIso: () => new Date().toISOString() };
const monotonic = { nowMs: () => Date.now() };
const ids = {
  newId: () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
};

/** Parte de arquivo do multipart no React Native: { uri, name, type }. */
const audioPart = async (path: string) => ({
  uri: path,
  name: path.split('/').pop() ?? 'audio.m4a',
  type: 'audio/m4a',
});

export async function createContainer(): Promise<AppContainer> {
  const db = await openEscribaDatabase();
  await migrate(db);

  const meetings = new MeetingRepository(db);
  const transcripts = new TranscriptRepository(db);
  const points = new PointRepository(db);
  const artifacts = new ArtifactRepository(db);
  const queue = new RefinementQueueRepository(db);
  const settings = new SettingsRepository(db);

  const session = new MeetingSessionService({
    meetings,
    transcripts,
    points,
    queue,
    clock,
    ids,
    files: audioFileStore,
  });

  const providerDeps = { http, keys: secureKeyStore, audioPart };

  return {
    meetings,
    transcripts,
    points,
    artifacts,
    settings,
    session,
    recording: new RecordingService({ session, recorder: createExpoRecorder() }),
    liveTranscription: new LiveTranscriptionService({
      session,
      recognizer: createExpoSpeechRecognizer(),
      monotonic,
      ids,
    }),
    speakers: new SpeakerService({ meetings, transcripts, points, artifacts, clock }),
    async createLiveAssist() {
      const llmId = await settings.getSelectedProvider('llm');
      return new LiveAssistService({ transcripts, points, llm: createLlmProvider(llmId, providerDeps), ids });
    },
    async createRefinement() {
      const sttId = await settings.getSelectedProvider('stt-batch');
      return new RefinementService({
        meetings,
        transcripts,
        points,
        artifacts,
        queue,
        provider: createSttProvider(sttId, providerDeps),
        clock,
        ids,
      });
    },
  };
}
