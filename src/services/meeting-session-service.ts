import {
  transition,
  type MeetingSessionState,
  type SessionEvent,
} from '../domain/meeting-session';
import { addSegment, type TranscriptSegment } from '../domain/transcript';
import { anchorPoint, type ExtractedPoint, type PointAnchor } from '../domain/extracted-point';
import { MeetingRepository, MeetingNotFoundError, type MeetingRecord } from '../db/repository/meeting-repository';
import type { TranscriptRepository } from '../db/repository/transcript-repository';
import type { PointRepository } from '../db/repository/point-repository';
import type { RefinementQueueRepository } from '../db/repository/refinement-queue-repository';
import type { AudioFileStore, Clock, IdGenerator } from './ports';

export interface NewPointInput {
  sectionId: string;
  text: string;
  anchor: PointAnchor;
}

interface Deps {
  meetings: MeetingRepository;
  transcripts: TranscriptRepository;
  points: PointRepository;
  queue: RefinementQueueRepository;
  clock: Clock;
  ids: IdGenerator;
  files: AudioFileStore;
}

/**
 * Orquestra a sessão de reunião (REQ-01/05): transições persistidas via máquina de
 * estados do domínio, rascunho ao vivo, pontos validados por âncora e encerramento
 * enfileirando o refinamento. Hooks da UI chamam apenas este service.
 */
export class MeetingSessionService {
  constructor(private readonly deps: Deps) {}

  async createMeeting(title: string, typeId: string, consentConfirmed: boolean): Promise<MeetingRecord> {
    const meeting: MeetingRecord = {
      id: this.deps.ids.newId(),
      title,
      typeId,
      status: 'idle',
      consentConfirmed,
      createdAt: this.deps.clock.nowIso(),
      audioSegments: [],
    };
    await this.deps.meetings.save(meeting);
    return meeting;
  }

  async start(meetingId: string): Promise<void> {
    await this.applyEvent(meetingId, 'start');
  }

  async pause(meetingId: string): Promise<void> {
    await this.applyEvent(meetingId, 'pause');
  }

  async resume(meetingId: string): Promise<void> {
    await this.applyEvent(meetingId, 'resume');
  }

  /** Encerra a sessão e enfileira o refinamento pós-reunião (REQ-03). */
  async end(meetingId: string): Promise<void> {
    await this.applyEvent(meetingId, 'end');
    await this.deps.queue.enqueue(meetingId, this.deps.clock.nowIso());
  }

  async addAudioSegment(meetingId: string, path: string): Promise<void> {
    const meeting = await this.loadOrThrow(meetingId);
    await this.deps.meetings.save({ ...meeting, audioSegments: [...meeting.audioSegments, path] });
  }

  async addDraftSegment(meetingId: string, segment: TranscriptSegment): Promise<void> {
    const existing = await this.deps.transcripts.listByMeeting(meetingId);
    addSegment(existing, segment); // valida duplicidade e draft-sem-falante
    await this.deps.transcripts.saveMany(meetingId, [segment]);
  }

  /** Persiste um ponto extraído somente se a âncora existir na transcrição (anti-alucinação, REQ-05). */
  async addPoint(meetingId: string, input: NewPointInput): Promise<ExtractedPoint> {
    const segments = await this.deps.transcripts.listByMeeting(meetingId);
    const point = anchorPoint({ id: this.deps.ids.newId(), ...input }, segments);
    await this.deps.points.save(meetingId, point);
    return point;
  }

  /** Exclusão definitiva (REQ-10): arquivos de áudio + linhas em cascata no banco. */
  async deleteMeeting(meetingId: string): Promise<void> {
    const meeting = await this.loadOrThrow(meetingId);
    await this.deps.files.deleteFiles(meeting.audioSegments);
    await this.deps.meetings.delete(meetingId);
  }

  private async applyEvent(meetingId: string, event: SessionEvent): Promise<void> {
    const meeting = await this.loadOrThrow(meetingId);
    const state: MeetingSessionState = {
      meetingId: meeting.id,
      status: meeting.status,
      audioSegments: meeting.audioSegments,
    };
    const next = transition(state, event);
    await this.deps.meetings.save({ ...meeting, status: next.status });
  }

  private async loadOrThrow(meetingId: string): Promise<MeetingRecord> {
    const meeting = await this.deps.meetings.findById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);
    return meeting;
  }
}
