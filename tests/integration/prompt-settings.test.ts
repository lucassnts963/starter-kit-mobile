import { createTestDatabase } from '../helpers/node-sqlite-database';
import { migrate } from '../../src/db/migrations';
import { SettingsRepository } from '../../src/db/repository/settings-repository';
import {
  buildExtractionPrompt,
  EXTRACTION_FORMAT_CONTRACT,
  EXTRACTION_GUIDANCE,
} from '../../src/adapters/llm/parse-candidates';

describe('extraction prompt configurável (REQ-13 amendment)', () => {
  it('should default to the editable guidance when the user never customized it', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_GUIDANCE);
  });

  it('should always inject the mandatory format contract, even for a custom guidance', () => {
    const full = buildExtractionPrompt('Extraia apenas riscos.');
    expect(full).toContain('Extraia apenas riscos.');
    expect(full).toContain(EXTRACTION_FORMAT_CONTRACT);
  });

  it('should fall back to default guidance inside buildExtractionPrompt when guidance is blank', () => {
    const full = buildExtractionPrompt('   ');
    expect(full).toContain(EXTRACTION_GUIDANCE);
    expect(full).toContain(EXTRACTION_FORMAT_CONTRACT);
  });

  it('should persist a custom prompt and read it back', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);

    await settings.setExtractionPrompt('Extraia apenas decisões e responsáveis. Responda JSON.');
    expect(await settings.getExtractionPrompt()).toBe('Extraia apenas decisões e responsáveis. Responda JSON.');
  });

  it('should fall back to the default when a blank prompt is saved (evita quebrar a extração)', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);

    await settings.setExtractionPrompt('   ');
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_GUIDANCE);
  });

  it('should reset to the default prompt', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);

    await settings.setExtractionPrompt('algo custom');
    await settings.resetExtractionPrompt();
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_GUIDANCE);
  });
});
