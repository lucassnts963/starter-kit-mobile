import {
  createSession,
  transition,
  restoreSession,
  InvalidTransitionError,
  type MeetingSessionState,
} from './meeting-session';

describe('meeting-session state machine (TEST-01)', () => {
  it('should start in idle when session is created', () => {
    const s = createSession('meeting-1');
    expect(s.status).toBe('idle');
    expect(s.meetingId).toBe('meeting-1');
    expect(s.audioSegments).toEqual([]);
  });

  it('should follow the happy path idle → recording → paused → recording → ended → refining → done', () => {
    let s = createSession('m1');
    s = transition(s, 'start');
    expect(s.status).toBe('recording');
    s = transition(s, 'pause');
    expect(s.status).toBe('paused');
    s = transition(s, 'resume');
    expect(s.status).toBe('recording');
    s = transition(s, 'end');
    expect(s.status).toBe('ended');
    s = transition(s, 'startRefinement');
    expect(s.status).toBe('refining');
    s = transition(s, 'completeRefinement');
    expect(s.status).toBe('done');
  });

  it('should allow ending directly from paused', () => {
    let s = createSession('m1');
    s = transition(s, 'start');
    s = transition(s, 'pause');
    s = transition(s, 'end');
    expect(s.status).toBe('ended');
  });

  it('should throw InvalidTransitionError when resuming a session that is not paused', () => {
    const s = createSession('m1');
    expect(() => transition(s, 'resume')).toThrow(InvalidTransitionError);
  });

  it('should throw InvalidTransitionError when starting refinement before the session ended', () => {
    let s = createSession('m1');
    s = transition(s, 'start');
    expect(() => transition(s, 'startRefinement')).toThrow(InvalidTransitionError);
  });

  it('should throw InvalidTransitionError when recording after done', () => {
    let s = createSession('m1');
    for (const e of ['start', 'end', 'startRefinement', 'completeRefinement'] as const) {
      s = transition(s, e);
    }
    expect(() => transition(s, 'start')).toThrow(InvalidTransitionError);
  });

  it('should accumulate audio segments while recording and preserve them across transitions', () => {
    let s = createSession('m1');
    s = transition(s, 'start');
    s = { ...s, audioSegments: [...s.audioSegments, 'seg-001.m4a'] };
    s = transition(s, 'pause');
    s = transition(s, 'resume');
    s = { ...s, audioSegments: [...s.audioSegments, 'seg-002.m4a'] };
    s = transition(s, 'end');
    expect(s.audioSegments).toEqual(['seg-001.m4a', 'seg-002.m4a']);
  });
});

describe('session recovery from crash (TEST-02)', () => {
  it('should resume in paused with segments preserved when snapshot was recording', () => {
    const snapshot: MeetingSessionState = {
      meetingId: 'm1',
      status: 'recording',
      audioSegments: ['seg-001.m4a', 'seg-002.m4a'],
    };
    const restored = restoreSession(snapshot);
    expect(restored.status).toBe('paused');
    expect(restored.audioSegments).toEqual(['seg-001.m4a', 'seg-002.m4a']);
  });

  it('should keep terminal/non-recording statuses unchanged on restore', () => {
    for (const status of ['idle', 'paused', 'ended', 'refining', 'done'] as const) {
      const restored = restoreSession({ meetingId: 'm1', status, audioSegments: [] });
      expect(restored.status).toBe(status);
    }
  });

  it('should allow ending a restored session and proceeding to refinement (partial artifacts)', () => {
    let s = restoreSession({ meetingId: 'm1', status: 'recording', audioSegments: ['a.m4a'] });
    s = transition(s, 'end');
    s = transition(s, 'startRefinement');
    expect(s.status).toBe('refining');
    expect(s.audioSegments).toEqual(['a.m4a']);
  });
});
