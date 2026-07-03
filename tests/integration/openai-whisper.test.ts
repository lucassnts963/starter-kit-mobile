import { OpenAiWhisperProvider } from '../../src/adapters/stt/openai-whisper';
import { MissingApiKeyError, ProviderApiError } from '../../src/adapters/errors';
import type { HttpClient, HttpResponse } from '../../src/adapters/http';
import type { ApiKeyStore } from '../../src/adapters/secure-keys';

/** Fixture no formato verbose_json do endpoint /v1/audio/transcriptions. */
const whisperFixture = {
  text: 'precisamos gravar as reuniões',
  segments: [
    { id: 0, start: 0.0, end: 1.6, text: ' precisamos gravar as reuniões' },
    { id: 1, start: 2.0, end: 3.2, text: ' e exportar a ata' },
  ],
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

describe('openai whisper adapter contract (TEST-18, 2º provedor STT)', () => {
  it('should not claim diarization (capability flag → aviso na UI, US-10.3)', () => {
    const provider = new OpenAiWhisperProvider({ http: jest.fn(), keys: keysWith('k'), audioPart });
    expect(provider.id).toBe('openai-whisper');
    expect(provider.supportsDiarization).toBe(false);
  });

  it('should map verbose_json segments to final segments without speaker', async () => {
    const http: HttpClient = jest.fn(async () => response(200, whisperFixture));
    const provider = new OpenAiWhisperProvider({ http, keys: keysWith('sk-key'), audioPart });

    const segments = await provider.transcribe(['a.m4a'], { language: 'pt' });

    expect(segments).toEqual([
      { text: 'precisamos gravar as reuniões', startMs: 0, endMs: 1600 },
      { text: 'e exportar a ata', startMs: 2000, endMs: 3200 },
    ]);
  });

  it('should send bearer auth and language to the OpenAI endpoint', async () => {
    const http = jest.fn(async () => response(200, whisperFixture));
    const provider = new OpenAiWhisperProvider({ http, keys: keysWith('sk-key'), audioPart });
    await provider.transcribe(['a.m4a'], { language: 'pt' });

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: FormData }];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(init.headers['Authorization']).toBe('Bearer sk-key');
    expect(init.body.get('language')).toBe('pt');
  });

  it('should return an empty list for silent audio (sem segments)', async () => {
    const http: HttpClient = jest.fn(async () => response(200, { text: '', segments: [] }));
    const provider = new OpenAiWhisperProvider({ http, keys: keysWith('sk') , audioPart});
    expect(await provider.transcribe(['a.m4a'], { language: 'pt' })).toEqual([]);
  });

  it('should throw typed errors on missing key and API failure (TEST-12)', async () => {
    const noKey = new OpenAiWhisperProvider({ http: jest.fn(), keys: keysWith(null), audioPart });
    await expect(noKey.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(MissingApiKeyError);

    const http: HttpClient = jest.fn(async () => response(500, { error: 'boom' }));
    const failing = new OpenAiWhisperProvider({ http, keys: keysWith('sk'), audioPart });
    await expect(failing.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(ProviderApiError);
  });
});
