import type { MeetingRecord } from '../db/repository/meeting-repository';

/**
 * Filtro puro do histórico (REQ-09): título (case-insensitive) ou fragmento de data
 * (YYYY-MM-DD). Na UI, envolver em `useMemo` (conventions.md## Filtering / Search).
 */
export function filterMeetings(meetings: MeetingRecord[], term: string): MeetingRecord[] {
  const t = term.trim().toLowerCase();
  if (t === '') return meetings;
  return meetings.filter(
    (m) => m.title.toLowerCase().includes(t) || m.createdAt.slice(0, 10).includes(t),
  );
}
