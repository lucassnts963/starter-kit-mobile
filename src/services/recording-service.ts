import type { MeetingSessionService } from './meeting-session-service';
import type { RecorderPort } from './recording-ports';
import type { AudioFileStore } from './ports';

interface Deps {
  session: MeetingSessionService;
  recorder: RecorderPort;
  /** Persiste cada segmento na pasta durável do app antes de registrar (ouvir depois). */
  files: AudioFileStore;
}

/**
 * Gravação segmentada (REQ-01, NFR-01): pause fecha o segmento atual e o persiste;
 * resume abre um novo. Segmentos já persistidos nunca se perdem — é a base da
 * recuperação pós-crash e do refinamento com offset entre arquivos. Cada segmento é
 * copiado para armazenamento durável (o gravador escreve em cache) para poder ser
 * reouvido no futuro até o usuário apagar a reunião (REQ-10).
 */
export class RecordingService {
  constructor(private readonly deps: Deps) {}

  async start(meetingId: string): Promise<void> {
    // gravador primeiro: se o microfone falhar, a sessão não transiciona
    await this.deps.recorder.start();
    await this.deps.session.start(meetingId);
  }

  async pause(meetingId: string): Promise<void> {
    const path = await this.persistSegment(meetingId, await this.deps.recorder.stop());
    await this.deps.session.addAudioSegment(meetingId, path);
    await this.deps.session.pause(meetingId);
  }

  async resume(meetingId: string): Promise<void> {
    await this.deps.recorder.start();
    await this.deps.session.resume(meetingId);
  }

  async stop(meetingId: string): Promise<void> {
    try {
      const path = await this.persistSegment(meetingId, await this.deps.recorder.stop());
      await this.deps.session.addAudioSegment(meetingId, path);
    } catch {
      // o segmento em andamento falhou, mas os já persistidos seguem válidos:
      // encerrar mesmo assim para gerar os artefatos do que existe (REQ-01.3)
    }
    await this.deps.session.end(meetingId);
  }

  /**
   * Registra um arquivo de áudio já existente (escolhido pelo usuário) como o único
   * segmento da sessão e encerra direto para refinamento — não usa o gravador nativo.
   * A URI importada (content://, transitória) é copiada para a pasta durável do app.
   */
  async importAudio(meetingId: string, filePath: string): Promise<void> {
    await this.deps.session.start(meetingId);
    const durable = await this.persistSegment(meetingId, filePath);
    await this.deps.session.addAudioSegment(meetingId, durable);
    await this.deps.session.end(meetingId);
  }

  private persistSegment(meetingId: string, uri: string): Promise<string> {
    return this.deps.files.persist(uri, meetingId);
  }
}
