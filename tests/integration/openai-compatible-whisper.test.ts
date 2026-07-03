import { OpenAiCompatibleWhisperProvider } from '../../src/adapters/stt/openai-compatible-whisper';
import { MissingApiKeyError, ProviderApiError } from '../../src/adapters/errors';
import type { HttpClient, HttpResponse } from '../../src/adapters/http';
import type { ApiKeyStore } from '../../src/adapters/secure-keys';

/** Fixture no formato verbose_json do endpoint /openai/v1/audio/transcriptions (Groq). */
const whisperFixture = {
  text: 'precisamos gravar as reuniões',
  segments: [{ id: 0, start: 0.0, end: 1.6, text: ' precisamos gravar as reuniões' }],
};

function response(status: number, body: unknown): HttpResponse {
  return { ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

const keysWith = (key: string | null): ApiKeyStore => ({
  getKey: async () => key,
  setKey: async () => undefined,
  deleteKey: async () => undefined,
});

const audioPart = async (path: string) => ({ fakeFilePart: path });

/**
 * Provedor STT genérico compatível com o endpoint /audio/transcriptions da OpenAI (REQ-13
 * amendment) — Groq hospeda Whisper large-v3 gratuito/muito barato nesse mesmo formato.
 */
describe('OpenAiCompatibleWhisperProvider (Groq — STT gratuito/barato)', () => {
  it('should not claim diarization (capability flag → aviso na UI, US-10.3)', () => {
    const provider = new OpenAiCompatibleWhisperProvider(
      { http: jest.fn(), keys: keysWith('k'), audioPart },
      { id: 'groq-whisper', baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3' },
    );
    expect(provider.id).toBe('groq-whisper');
    expect(provider.supportsDiarization).toBe(false);
  });

  it('should call the configured baseUrl/model and map verbose_json segments', async () => {
    const http = jest.fn(async () => response(200, whisperFixture));
    const provider = new OpenAiCompatibleWhisperProvider(
      { http, keys: keysWith('gsk'), audioPart },
      { id: 'groq-whisper', baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3' },
    );

    const segments = await provider.transcribe(['a.m4a'], { language: 'pt' });
    expect(segments).toEqual([{ text: 'precisamos gravar as reuniões', startMs: 0, endMs: 1600 }]);

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: FormData }];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.headers['Authorization']).toBe('Bearer gsk');
    expect(init.body.get('model')).toBe('whisper-large-v3');
  });

  it('should throw typed errors on missing key and API failure (TEST-12)', async () => {
    const cfg = { id: 'groq-whisper', baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3' };
    const noKey = new OpenAiCompatibleWhisperProvider({ http: jest.fn(), keys: keysWith(null), audioPart }, cfg);
    await expect(noKey.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(MissingApiKeyError);

    const http: HttpClient = jest.fn(async () => response(500, { error: 'boom' }));
    const failing = new OpenAiCompatibleWhisperProvider({ http, keys: keysWith('k'), audioPart }, cfg);
    await expect(failing.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(ProviderApiError);
  });
});
