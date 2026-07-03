import type { SqlDatabase } from '../database';

interface Migration {
  version: number;
  sql: string;
}

/** Migrations versionadas, aplicadas em ordem no boot (conventions.md## Database). */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        consent_confirmed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        audio_segments TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE transcript_segments (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('draft','final')),
        text TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,
        speaker TEXT
      );
      CREATE INDEX idx_transcript_meeting ON transcript_segments(meeting_id, kind, start_ms);
      CREATE TABLE extracted_points (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        section_id TEXT NOT NULL,
        text TEXT NOT NULL,
        anchor_segment_id TEXT NOT NULL,
        anchor_quote TEXT NOT NULL
      );
      CREATE INDEX idx_points_meeting ON extracted_points(meeting_id);
      CREATE TABLE artifacts (
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('minutes','requirements')),
        markdown TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (meeting_id, kind)
      );
      CREATE TABLE refinement_queue (
        meeting_id TEXT PRIMARY KEY REFERENCES meetings(id) ON DELETE CASCADE,
        enqueued_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
];

export async function migrate(db: SqlDatabase): Promise<void> {
  // FK enforcement é por conexão no SQLite — sempre ligar, fora do guard de versão
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.execAsync(migration.sql);
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}
