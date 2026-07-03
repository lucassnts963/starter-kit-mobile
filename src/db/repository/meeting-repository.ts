import type { SqlDatabase } from '../database';
import type { SessionStatus } from '../../domain/meeting-session';

export interface MeetingRecord {
  id: string;
  title: string;
  typeId: string;
  status: SessionStatus;
  consentConfirmed: boolean;
  createdAt: string;
  audioSegments: string[];
}

interface MeetingRow {
  id: string;
  title: string;
  type_id: string;
  status: string;
  consent_confirmed: number;
  created_at: string;
  audio_segments: string;
}

export class MeetingNotFoundError extends Error {
  constructor(id: string) {
    super(`Reunião "${id}" não encontrada`);
    this.name = 'MeetingNotFoundError';
  }
}

function toRecord(row: MeetingRow): MeetingRecord {
  return {
    id: row.id,
    title: row.title,
    typeId: row.type_id,
    status: row.status as SessionStatus,
    consentConfirmed: row.consent_confirmed === 1,
    createdAt: row.created_at,
    audioSegments: JSON.parse(row.audio_segments) as string[],
  };
}

export class MeetingRepository {
  constructor(private readonly db: SqlDatabase) {}

  async save(meeting: MeetingRecord): Promise<void> {
    // UPSERT verdadeiro (ON CONFLICT DO UPDATE): INSERT OR REPLACE deletaria a linha e
    // dispararia o ON DELETE CASCADE, apagando transcrições/pontos/artefatos/fila (TRB-001)
    await this.db.runAsync(
      `INSERT INTO meetings (id, title, type_id, status, consent_confirmed, created_at, audio_segments)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         type_id = excluded.type_id,
         status = excluded.status,
         consent_confirmed = excluded.consent_confirmed,
         created_at = excluded.created_at,
         audio_segments = excluded.audio_segments`,
      [
        meeting.id,
        meeting.title,
        meeting.typeId,
        meeting.status,
        meeting.consentConfirmed ? 1 : 0,
        meeting.createdAt,
        JSON.stringify(meeting.audioSegments),
      ],
    );
  }

  async findById(id: string): Promise<MeetingRecord | null> {
    const row = await this.db.getFirstAsync<MeetingRow>('SELECT * FROM meetings WHERE id = ?', [id]);
    return row ? toRecord(row) : null;
  }

  async list(): Promise<MeetingRecord[]> {
    const rows = await this.db.getAllAsync<MeetingRow>('SELECT * FROM meetings ORDER BY created_at DESC');
    return rows.map(toRecord);
  }

  async searchByTitle(term: string): Promise<MeetingRecord[]> {
    const rows = await this.db.getAllAsync<MeetingRow>(
      'SELECT * FROM meetings WHERE LOWER(title) LIKE LOWER(?) ORDER BY created_at DESC',
      [`%${term}%`],
    );
    return rows.map(toRecord);
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM meetings WHERE id = ?', [id]);
  }
}
