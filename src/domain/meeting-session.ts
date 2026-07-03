export type SessionStatus = 'idle' | 'recording' | 'paused' | 'ended' | 'refining' | 'done';

export type SessionEvent = 'start' | 'pause' | 'resume' | 'end' | 'startRefinement' | 'completeRefinement';

export interface MeetingSessionState {
  meetingId: string;
  status: SessionStatus;
  /** Caminhos dos segmentos de áudio já persistidos (gravação segmentada → recuperação pós-crash). */
  audioSegments: string[];
}

export class InvalidTransitionError extends Error {
  constructor(status: SessionStatus, event: SessionEvent) {
    super(`Transição inválida: evento "${event}" no estado "${status}"`);
    this.name = 'InvalidTransitionError';
  }
}

const TRANSITIONS: Record<SessionStatus, Partial<Record<SessionEvent, SessionStatus>>> = {
  idle: { start: 'recording' },
  recording: { pause: 'paused', end: 'ended' },
  paused: { resume: 'recording', end: 'ended' },
  ended: { startRefinement: 'refining' },
  refining: { completeRefinement: 'done' },
  done: {},
};

export function createSession(meetingId: string): MeetingSessionState {
  return { meetingId, status: 'idle', audioSegments: [] };
}

export function transition(state: MeetingSessionState, event: SessionEvent): MeetingSessionState {
  const next = TRANSITIONS[state.status][event];
  if (!next) {
    throw new InvalidTransitionError(state.status, event);
  }
  return { ...state, status: next };
}

/**
 * Recuperação pós-crash (REQ-01): um snapshot que estava gravando volta em `paused` —
 * o áudio já persistido é preservado e o condutor decide retomar ou encerrar.
 */
export function restoreSession(snapshot: MeetingSessionState): MeetingSessionState {
  if (snapshot.status === 'recording') {
    return { ...snapshot, status: 'paused' };
  }
  return { ...snapshot };
}
