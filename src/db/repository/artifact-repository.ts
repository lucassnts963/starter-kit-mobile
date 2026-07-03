import type { SqlDatabase } from '../database';

export type ArtifactKind = 'minutes' | 'requirements';

export interface ArtifactRecord {
  meetingId: string;
  kind: ArtifactKind;
  markdown: string;
  createdAt: string;
}

interface ArtifactRow {
  meeting_id: string;
  kind: string;
  markdown: string;
  created_at: string;
}

export class ArtifactRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Upsert por (meeting, kind): regenerar (ex.: após renomear falante) substitui o artefato. */
  async save(meetingId: string, kind: ArtifactKind, markdown: string, createdAt: string): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO artifacts (meeting_id, kind, markdown, created_at) VALUES (?, ?, ?, ?)`,
      [meetingId, kind, markdown, createdAt],
    );
  }

  async findByMeetingAndKind(meetingId: string, kind: ArtifactKind): Promise<ArtifactRecord | null> {
    const row = await this.db.getFirstAsync<ArtifactRow>(
      'SELECT * FROM artifacts WHERE meeting_id = ? AND kind = ?',
      [meetingId, kind],
    );
    if (!row) return null;
    return {
      meetingId: row.meeting_id,
      kind: row.kind as ArtifactKind,
      markdown: row.markdown,
      createdAt: row.created_at,
    };
  }
}
