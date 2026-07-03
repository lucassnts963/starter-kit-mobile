import type { MeetingSessionService } from './meeting-session-service';
import type { Monotonic, SpeechRecognizerPort } from './recording-ports';
import type { IdGenerator } from './ports';

export type LiveTranscriptionStart = { ok: true } | { ok: false; reason: string };

export interface LiveTranscriptionStatus {
  active: boolean;
  degraded: boolean;
  reason?: string;
}

interface SessionState {
  stopped: boolean;
  degraded: boolean;
  reason?: string;
  /** Encadeia persistências/reinícios disparados por callbacks nativos. */
  pending: Promise<void>;
}

interface Deps {
  session: MeetingSessionService;
  recognizer: SpeechRecognizerPort;
  monotonic: Monotonic;
  ids: IdGenerator;
}

/**
 * Rascunho ao vivo via STT nativo (REQ-02): resultados finais viram segmentos draft;
 * quando a sessão nativa expira (iOS ~1min, silêncio) reinicia automaticamente; erro
 * degrada para somente-gravação sem interromper a sessão (NFR-06).
 */
export class LiveTranscriptionService {
  private readonly states = new Map<string, SessionState>();

  constructor(private readonly deps: Deps) {}

  async start(meetingId: string, language: string): Promise<LiveTranscriptionStart> {
    if (!(await this.deps.recognizer.available())) {
      this.states.set(meetingId, {
        stopped: true,
        degraded: true,
        reason: 'stt-indisponivel',
        pending: Promise.resolve(),
      });
      return { ok: false, reason: 'stt-indisponivel' };
    }
    const state: SessionState = { stopped: false, degraded: false, pending: Promise.resolve() };
    this.states.set(meetingId, state);
    await this.begin(meetingId, language, state);
    return { ok: true };
  }

  async stop(meetingId: string): Promise<void> {
    const state = this.states.get(meetingId);
    if (state) {
      state.stopped = true;
      await state.pending;
    }
    await this.deps.recognizer.stop();
  }

  status(meetingId: string): LiveTranscriptionStatus {
    const state = this.states.get(meetingId);
    if (!state) return { active: false, degraded: false };
    return {
      active: !state.stopped && !state.degraded,
      degraded: state.degraded,
      ...(state.reason !== undefined ? { reason: state.reason } : {}),
    };
  }

  /** Aguarda persistências/reinícios pendentes (callbacks nativos são fire-and-forget). */
  async flush(): Promise<void> {
    for (const state of this.states.values()) {
      await state.pending;
    }
  }

  private async begin(meetingId: string, language: string, state: SessionState): Promise<void> {
    await this.deps.recognizer.start(
      { language },
      {
        onResult: (result) => {
          if (!result.isFinal) return;
          state.pending = state.pending.then(() => this.persistDraft(meetingId, result.text));
        },
        onEnd: () => {
          if (state.stopped || state.degraded) return;
          state.pending = state.pending.then(() => this.begin(meetingId, language, state));
        },
        onError: (message) => {
          state.degraded = true;
          state.reason = message;
        },
      },
    );
  }

  private async persistDraft(meetingId: string, text: string): Promise<void> {
    const nowMs = this.deps.monotonic.nowMs();
    await this.deps.session.addDraftSegment(meetingId, {
      id: this.deps.ids.newId(),
      kind: 'draft',
      text,
      startMs: nowMs,
      endMs: nowMs,
    });
  }
}
