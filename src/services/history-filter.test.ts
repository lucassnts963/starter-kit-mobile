import { filterMeetings } from './history-filter';
import type { MeetingRecord } from '../db/repository/meeting-repository';

const meeting = (id: string, title: string, createdAt: string): MeetingRecord => ({
  id,
  title,
  typeId: 'generic-meeting',
  status: 'done',
  consentConfirmed: true,
  createdAt,
  audioSegments: [],
});

const meetings = [
  meeting('m1', 'Kickoff CRM', '2026-07-01T10:00:00.000Z'),
  meeting('m2', 'Retro sprint 3', '2026-07-02T15:30:00.000Z'),
  meeting('m3', 'Levantamento CRM fase 2', '2026-07-03T09:00:00.000Z'),
];

describe('history search filter (TEST-13, REQ-09)', () => {
  it('should return everything for an empty term', () => {
    expect(filterMeetings(meetings, '')).toEqual(meetings);
    expect(filterMeetings(meetings, '   ')).toEqual(meetings);
  });

  it('should filter by title, case-insensitive and acento-insensitive no termo cru', () => {
    expect(filterMeetings(meetings, 'crm').map((m) => m.id)).toEqual(['m1', 'm3']);
    expect(filterMeetings(meetings, 'RETRO').map((m) => m.id)).toEqual(['m2']);
  });

  it('should filter by date fragment (YYYY-MM-DD)', () => {
    expect(filterMeetings(meetings, '2026-07-02').map((m) => m.id)).toEqual(['m2']);
  });

  it('should return empty when nothing matches', () => {
    expect(filterMeetings(meetings, 'planning')).toEqual([]);
  });
});
