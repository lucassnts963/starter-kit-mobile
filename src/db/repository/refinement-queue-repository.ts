import type { SqlDatabase } from '../database';

export interface QueueItem {
  meetingId: string;
  enqueuedAt: string;
  attempts: number;
  lastError: string | null;
}

interface QueueRow {
  meeting_id: string;
  enqueued_at: string;
  attempts: number;
  last_error: string | null;
}

/** Fila offline-first do refinamento pós-reunião (REQ-03, NFR-06). */
export class RefinementQueueRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Idempotente: re-enfileirar a mesma reunião não duplica nem reseta tentativas. */
  async enqueue(meetingId: string, enqueuedAt: string): Promise<void> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO refinement_queue (meeting_id, enqueued_at) VALUES (?, ?)',
      [meetingId, enqueuedAt],
    );
  }

  async pending(): Promise<QueueItem[]> {
    const rows = await this.db.getAllAsync<QueueRow>(
      'SELECT * FROM refinement_queue ORDER BY enqueued_at',
    );
    return rows.map((r) => ({
      meetingId: r.meeting_id,
      enqueuedAt: r.enqueued_at,
      attempts: r.attempts,
      lastError: r.last_error,
    }));
  }

  async recordFailure(meetingId: string, error: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE refinement_queue SET attempts = attempts + 1, last_error = ? WHERE meeting_id = ?',
      [error, meetingId],
    );
  }

  async remove(meetingId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM refinement_queue WHERE meeting_id = ?', [meetingId]);
  }
}
