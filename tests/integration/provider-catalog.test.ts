import {
  PROVIDERS,
  listProviders,
  getProviderDescriptor,
  createSttProvider,
  createLlmProvider,
  UnknownProviderError,
} from '../../src/adapters/provider-catalog';
import { SettingsRepository } from '../../src/db/repository/settings-repository';
import { MeetingRepository } from '../../src/db/repository/meeting-repository';
import { migrate } from '../../src/db/migrations';
import { createTestDatabase } from '../helpers/node-sqlite-database';
import type { ApiKeyStore } from '../../src/adapters/secure-keys';

const keys: ApiKeyStore = {
  getKey: async () => 'k',
  setKey: async () => undefined,
  deleteKey: async () => undefined,
};
const deps = { http: jest.fn(), keys, audioPart: async (p: string) => ({ p }) };

describe('provider catalog capabilities (TEST-17, REQ-13)', () => {
  it('should list providers by capability with ElevenLabs available since the MVP', () => {
    const stt = listProviders('stt-batch');
    const llm = listProviders('llm');
    expect(stt.map((p) => p.id)).toContain('elevenlabs-scribe');
    expect(stt.map((p) => p.id)).toContain('openai-whisper');
    expect(llm.length).toBeGreaterThanOrEqual(2);
    expect(PROVIDERS.every((p) => p.label.length > 0)).toBe(true);
  });

  it('should expose diarization capability flags for the pre-meeting warning (US-10.3)', () => {
    expect(getProviderDescriptor('elevenlabs-scribe').supportsDiarization).toBe(true);
    expect(getProviderDescriptor('openai-whisper').supportsDiarization).toBe(false);
  });

  it('should build STT and LLM providers from their ids', () => {
    const stt = createSttProvider('elevenlabs-scribe', deps);
    expect(stt.id).toBe('elevenlabs-scribe');
    const llm = createLlmProvider('openai-llm', deps);
    expect(llm.id).toBe('openai-llm');
  });

  it('should throw a typed error for unknown providers and wrong-capability ids', () => {
    expect(() => getProviderDescriptor('nope')).toThrow(UnknownProviderError);
    expect(() => createSttProvider('openai-llm', deps)).toThrow(UnknownProviderError);
    expect(() => createLlmProvider('elevenlabs-scribe', deps)).toThrow(UnknownProviderError);
    expect(() => createLlmProvider('anthropic-llm', deps)).not.toThrow();
    expect(() => createSttProvider('openai-whisper', deps)).not.toThrow();
  });

  it('should reject selecting a provider of the wrong capability in settings', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);
    await expect(settings.setSelectedProvider('stt-batch', 'openai-llm')).rejects.toThrow(UnknownProviderError);
    await expect(settings.setSelectedProvider('llm', 'inexistente')).rejects.toThrow(UnknownProviderError);
  });

  it('should persist provider selection per capability and switch without touching meetings (REQ-13)', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const settings = new SettingsRepository(db);
    const meetings = new MeetingRepository(db);
    await meetings.save({
      id: 'm1',
      title: 'Kickoff',
      typeId: 'generic-meeting',
      status: 'done',
      consentConfirmed: true,
      createdAt: '2026-07-03T10:00:00.000Z',
      audioSegments: [],
    });

    // default embutido quando nada foi escolhido
    expect(await settings.getSelectedProvider('stt-batch')).toBe('elevenlabs-scribe');

    await settings.setSelectedProvider('stt-batch', 'openai-whisper');
    expect(await settings.getSelectedProvider('stt-batch')).toBe('openai-whisper');

    // trocar de provedor não invalida dados existentes
    expect((await meetings.findById('m1'))?.title).toBe('Kickoff');
  });
});
