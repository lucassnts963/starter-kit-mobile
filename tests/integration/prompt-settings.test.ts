import { createTestDatabase } from '../helpers/node-sqlite-database';
import { migrate } from '../../src/db/migrations';
import { SettingsRepository } from '../../src/db/repository/settings-repository';
import { EXTRACTION_SYSTEM_PROMPT } from '../../src/adapters/llm/parse-candidates';

describe('extraction prompt configurável (REQ-13 amendment)', () => {
  it('should default to the built-in extraction prompt when the user never customized it', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_SYSTEM_PROMPT);
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
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_SYSTEM_PROMPT);
  });

  it('should reset to the default prompt', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);

    await settings.setExtractionPrompt('algo custom');
    await settings.resetExtractionPrompt();
    expect(await settings.getExtractionPrompt()).toBe(EXTRACTION_SYSTEM_PROMPT);
  });
});
