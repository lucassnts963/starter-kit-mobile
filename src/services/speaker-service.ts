import { distinctSpeakers, renameSpeaker } from '../domain/transcript';
import { resolveMeetingType } from '../domain/templates';
import { buildMinutes } from '../domain/artifacts/minutes-builder';
import { buildRequirementsDoc } from '../domain/artifacts/requirements-builder';
import { MeetingNotFoundError, type MeetingRepository, type MeetingRecord } from '../db/repository/meeting-repository';
import type { TranscriptRepository } from '../db/repository/transcript-repository';
import type { PointRepository } from '../db/repository/point-repository';
import type { ArtifactRepository } from '../db/repository/artifact-repository';
import type { TranscriptSegment } from '../domain/transcript';
import type { Clock } from './ports';

interface Deps {
  meetings: MeetingRepository;
  transcripts: TranscriptRepository;
  points: PointRepository;
  artifacts: ArtifactRepository;
  clock: Clock;
}

/**
 * Renomeação de falantes (REQ-12): "Falante 1" → "Cliente – João" propaga em todos os
 * segmentos finais e REGENERA os artefatos pelos builders determinísticos — a ata e o
 * requirements.md armazenados são sempre reflexo da transcrição atual.
 */
export class SpeakerService {
  constructor(private readonly deps: Deps) {}

  async listSpeakers(meetingId: string): Promise<string[]> {
    return distinctSpeakers(await this.deps.transcripts.listByMeeting(meetingId));
  }

  async rename(meetingId: string, from: string, to: string): Promise<void> {
    const meeting = await this.deps.meetings.findById(meetingId);
    if (!meeting) throw new MeetingNotFoundError(meetingId);

    const segments = await this.deps.transcripts.listByMeeting(meetingId);
    const renamed = renameSpeaker(segments, from, to);
    await this.deps.transcripts.replaceKind(
      meetingId,
      'final',
      renamed.filter((s) => s.kind === 'final'),
    );
    await this.regenerateArtifacts(meeting, renamed);
  }

  private async regenerateArtifacts(meeting: MeetingRecord, segments: TranscriptSegment[]): Promise<void> {
    const type = resolveMeetingType(meeting.typeId);
    const points = await this.deps.points.listByMeeting(meeting.id);
    const meta = {
      title: meeting.title,
      date: meeting.createdAt.slice(0, 10),
      speakers: distinctSpeakers(segments),
    };
    await this.deps.artifacts.save(meeting.id, 'minutes', buildMinutes(meta, type, points), this.deps.clock.nowIso());
    if (type.output === 'minutes+requirements') {
      await this.deps.artifacts.save(
        meeting.id,
        'requirements',
        buildRequirementsDoc(meta, type, points),
        this.deps.clock.nowIso(),
      );
    }
  }
}
