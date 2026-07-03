import { createTestDatabase } from '../../tests/helpers/node-sqlite-database';
import { migrate } from '../db/migrations';
import { MeetingRepository } from '../db/repository/meeting-repository';
import { TranscriptRepository } from '../db/repository/transcript-repository';
import { PointRepository } from '../db/repository/point-repository';
import { ArtifactRepository } from '../db/repository/artifact-repository';
import { SpeakerService } from './speaker-service';
import type { SqlDatabase } from '../db/database';

async function seed(db: SqlDatabase) {
  await migrate(db);
  await new MeetingRepository(db).save({
    id: 'm1',
    title: 'Kickoff',
    typeId: 'requirements-elicitation',
    status: 'done',
    consentConfirmed: true,
    createdAt: '2026-07-03T10:00:00.000Z',
    audioSegments: [],
  });
  await new TranscriptRepository(db).saveMany('m1', [
    { id: 'f1', kind: 'final', text: 'nosso problema é retrabalho', startMs: 0, endMs: 2000, speaker: 'Falante 1' },
    { id: 'f2', kind: 'final', text: 'concordo, atrasa tudo', startMs: 2000, endMs: 3000, speaker: 'Falante 2' },
  ]);
  await new PointRepository(db).save('m1', {
    id: 'p1',
    sectionId: 'problem',
    text: 'Retrabalho recorrente',
    anchor: { segmentId: 'f1', quote: 'retrabalho' },
  });
  return new SpeakerService({
    meetings: new MeetingRepository(db),
    transcripts: new TranscriptRepository(db),
    points: new PointRepository(db),
    artifacts: new ArtifactRepository(db),
    clock: { nowIso: () => '2026-07-03T14:00:00.000Z' },
  });
}

describe('speaker rename regenerates artifacts (TEST-25, REQ-12)', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('should list distinct speakers of the refined transcript', async () => {
    const service = await seed(db);
    expect(await service.listSpeakers('m1')).toEqual(['Falante 1', 'Falante 2']);
  });

  it('should rename the speaker in every final segment and regenerate both artifacts', async () => {
    const service = await seed(db);

    await service.rename('m1', 'Falante 1', 'Cliente – João');

    const segments = await new TranscriptRepository(db).listByMeeting('m1');
    expect(segments.map((s) => s.speaker)).toEqual(['Cliente – João', 'Falante 2']);

    const artifacts = new ArtifactRepository(db);
    const minutes = await artifacts.findByMeetingAndKind('m1', 'minutes');
    expect(minutes?.markdown).toContain('Cliente – João');
    expect(minutes?.markdown).toContain('Retrabalho recorrente');
    expect(minutes?.markdown).not.toContain('Falante 1');
    const requirements = await artifacts.findByMeetingAndKind('m1', 'requirements');
    expect(requirements?.markdown).toContain('Retrabalho recorrente');
  });

  it('should fail loudly for an unknown meeting', async () => {
    const service = await seed(db);
    await expect(service.rename('nope', 'Falante 1', 'X')).rejects.toThrow();
  });
});
