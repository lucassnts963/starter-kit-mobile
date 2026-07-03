import type { SqlDatabase } from '../database';
import type { TranscriptKind, TranscriptSegment } from '../../domain/transcript';

interface SegmentRow {
  id: string;
  kind: string;
  text: string;
  start_ms: number;
  end_ms: number;
  speaker: string | null;
}

function toSegment(row: SegmentRow): TranscriptSegment {
  const segment: TranscriptSegment = {
    id: row.id,
    kind: row.kind as TranscriptKind,
    text: row.text,
    startMs: row.start_ms,
    endMs: row.end_ms,
  };
  if (row.speaker !== null) segment.speaker = row.speaker;
  return segment;
}

export class TranscriptRepository {
  constructor(private readonly db: SqlDatabase) {}

  async saveMany(meetingId: string, segments: TranscriptSegment[]): Promise<void> {
    for (const s of segments) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO transcript_segments (id, meeting_id, kind, text, start_ms, end_ms, speaker)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, meetingId, s.kind, s.text, s.startMs, s.endMs, s.speaker ?? null],
      );
    }
  }

  async listByMeeting(meetingId: string): Promise<TranscriptSegment[]> {
    const rows = await this.db.getAllAsync<SegmentRow>(
      'SELECT id, kind, text, start_ms, end_ms, speaker FROM transcript_segments WHERE meeting_id = ? ORDER BY start_ms, id',
      [meetingId],
    );
    return rows.map(toSegment);
  }

  /** Substitui toda a base de um `kind` — o refinamento troca a transcrição final inteira (REQ-03). */
  async replaceKind(meetingId: string, kind: TranscriptKind, segments: TranscriptSegment[]): Promise<void> {
    await this.db.runAsync('DELETE FROM transcript_segments WHERE meeting_id = ? AND kind = ?', [
      meetingId,
      kind,
    ]);
    await this.saveMany(meetingId, segments);
  }
}
