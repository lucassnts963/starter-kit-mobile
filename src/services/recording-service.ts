import type { MeetingSessionService } from './meeting-session-service';
import type { RecorderPort } from './recording-ports';

interface Deps {
  session: MeetingSessionService;
  recorder: RecorderPort;
}

/**
 * Gravação segmentada (REQ-01, NFR-01): pause fecha o segmento atual e o persiste;
 * resume abre um novo. Segmentos já persistidos nunca se perdem — é a base da
 * recuperação pós-crash e do refinamento com offset entre arquivos.
 */
export class RecordingService {
  constructor(private readonly deps: Deps) {}

  async start(meetingId: string): Promise<void> {
    // gravador primeiro: se o microfone falhar, a sessão não transiciona
    await this.deps.recorder.start();
    await this.deps.session.start(meetingId);
  }

  async pause(meetingId: string): Promise<void> {
    const path = await this.deps.recorder.stop();
    await this.deps.session.addAudioSegment(meetingId, path);
    await this.deps.session.pause(meetingId);
  }

  async resume(meetingId: string): Promise<void> {
    await this.deps.recorder.start();
    await this.deps.session.resume(meetingId);
  }

  async stop(meetingId: string): Promise<void> {
    try {
      const path = await this.deps.recorder.stop();
      await this.deps.session.addAudioSegment(meetingId, path);
    } catch {
      // o segmento em andamento falhou, mas os já persistidos seguem válidos:
      // encerrar mesmo assim para gerar os artefatos do que existe (REQ-01.3)
    }
    await this.deps.session.end(meetingId);
  }
}
