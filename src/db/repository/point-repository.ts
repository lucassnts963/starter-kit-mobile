import type { SqlDatabase } from '../database';
import type { ExtractedPoint } from '../../domain/extracted-point';

interface PointRow {
  id: string;
  section_id: string;
  text: string;
  anchor_segment_id: string;
  anchor_quote: string;
}

function toPoint(row: PointRow): ExtractedPoint {
  return {
    id: row.id,
    sectionId: row.section_id,
    text: row.text,
    anchor: { segmentId: row.anchor_segment_id, quote: row.anchor_quote },
  };
}

export class PointRepository {
  constructor(private readonly db: SqlDatabase) {}

  async save(meetingId: string, point: ExtractedPoint): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO extracted_points (id, meeting_id, section_id, text, anchor_segment_id, anchor_quote)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [point.id, meetingId, point.sectionId, point.text, point.anchor.segmentId, point.anchor.quote],
    );
  }

  async listByMeeting(meetingId: string): Promise<ExtractedPoint[]> {
    const rows = await this.db.getAllAsync<PointRow>(
      'SELECT id, section_id, text, anchor_segment_id, anchor_quote FROM extracted_points WHERE meeting_id = ? ORDER BY rowid',
      [meetingId],
    );
    return rows.map(toPoint);
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM extracted_points WHERE id = ?', [id]);
  }
}
