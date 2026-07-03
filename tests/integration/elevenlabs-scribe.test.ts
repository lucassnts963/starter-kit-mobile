import { ElevenLabsScribeProvider } from '../../src/adapters/stt/elevenlabs-scribe';
import { MissingApiKeyError, ProviderApiError } from '../../src/adapters/errors';
import type { HttpClient, HttpResponse } from '../../src/adapters/http';
import type { ApiKeyStore } from '../../src/adapters/secure-keys';

/** Fixture no formato da resposta do endpoint /v1/speech-to-text do ElevenLabs (Scribe). */
const scribeFixture = {
  language_code: 'pt',
  text: 'precisamos gravar as reuniões e exportar a ata',
  words: [
    { text: 'precisamos', start: 0.0, end: 0.5, type: 'word', speaker_id: 'speaker_0' },
    { text: ' ', start: 0.5, end: 0.52, type: 'spacing', speaker_id: 'speaker_0' },
    { text: 'gravar', start: 0.52, end: 0.9, type: 'word', speaker_id: 'speaker_0' },
    { text: ' ', start: 0.9, end: 0.92, type: 'spacing', speaker_id: 'speaker_0' },
    { text: 'as', start: 0.92, end: 1.0, type: 'word', speaker_id: 'speaker_0' },
    { text: ' ', start: 1.0, end: 1.02, type: 'spacing', speaker_id: 'speaker_0' },
    { text: 'reuniões', start: 1.02, end: 1.6, type: 'word', speaker_id: 'speaker_0' },
    { text: 'e', start: 2.0, end: 2.1, type: 'word', speaker_id: 'speaker_1' },
    { text: ' ', start: 2.1, end: 2.12, type: 'spacing', speaker_id: 'speaker_1' },
    { text: 'exportar', start: 2.12, end: 2.7, type: 'word', speaker_id: 'speaker_1' },
    { text: ' ', start: 2.7, end: 2.72, type: 'spacing', speaker_id: 'speaker_1' },
    { text: 'a', start: 2.72, end: 2.8, type: 'word', speaker_id: 'speaker_1' },
    { text: ' ', start: 2.8, end: 2.82, type: 'spacing', speaker_id: 'speaker_1' },
    { text: 'ata', start: 2.82, end: 3.2, type: 'word', speaker_id: 'speaker_1' },
  ],
};

function response(status: number, body: unknown): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const keysWith = (key: string | null): ApiKeyStore => ({
  getKey: async () => key,
  setKey: async () => undefined,
  deleteKey: async () => undefined,
});

const audioPart = async (path: string) => ({ fakeFilePart: path });

describe('elevenlabs scribe adapter contract (TEST-18)', () => {
  it('should declare diarization capability and its provider id', () => {
    const provider = new ElevenLabsScribeProvider({ http: jest.fn(), keys: keysWith('k'), audioPart });
    expect(provider.id).toBe('elevenlabs-scribe');
    expect(provider.supportsDiarization).toBe(true);
  });

  it('should map the Scribe response to final segments grouped by speaker with ms timestamps (REQ-12)', async () => {
    const http: HttpClient = jest.fn(async () => response(200, scribeFixture));
    const provider = new ElevenLabsScribeProvider({ http, keys: keysWith('xi-key'), audioPart });

    const segments = await provider.transcribe(['seg-001.m4a'], { language: 'pt' });

    expect(segments).toEqual([
      { text: 'precisamos gravar as reuniões', startMs: 0, endMs: 1600, speaker: 'Falante 1' },
      { text: 'e exportar a ata', startMs: 2000, endMs: 3200, speaker: 'Falante 2' },
    ]);
  });

  it('should send the api key header and diarize flag to the ElevenLabs endpoint', async () => {
    const http = jest.fn(async () => response(200, scribeFixture));
    const provider = new ElevenLabsScribeProvider({ http, keys: keysWith('xi-key'), audioPart });
    await provider.transcribe(['seg-001.m4a'], { language: 'pt' });

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: FormData }];
    expect(url).toBe('https://api.elevenlabs.io/v1/speech-to-text');
    expect(init.headers['xi-api-key']).toBe('xi-key');
    expect(init.body.get('diarize')).toBe('true');
    expect(init.body.get('language_code')).toBe('pt');
  });

  it('should offset timestamps across multiple audio files (gravação segmentada)', async () => {
    const http: HttpClient = jest.fn(async () => response(200, scribeFixture));
    const provider = new ElevenLabsScribeProvider({ http, keys: keysWith('xi-key'), audioPart });

    const segments = await provider.transcribe(['a.m4a', 'b.m4a'], { language: 'pt' });

    expect(segments).toHaveLength(4);
    // segundo arquivo desloca pelo fim do primeiro (3200ms)
    expect(segments[2]).toMatchObject({ startMs: 3200, text: 'precisamos gravar as reuniões' });
    expect(segments[3]).toMatchObject({ startMs: 5200, endMs: 6400 });
  });

  it('should map segments without speaker when the response has no diarization ids', async () => {
    const noSpeakers = {
      language_code: 'pt',
      text: 'oi tudo bem',
      words: [
        { text: 'oi', start: 0.0, end: 0.3, type: 'word' },
        { text: 'tudo', start: 0.4, end: 0.7, type: 'word' },
        { text: 'bem', start: 0.8, end: 1.0, type: 'word' },
      ],
    };
    const http: HttpClient = jest.fn(async () => response(200, noSpeakers));
    const provider = new ElevenLabsScribeProvider({ http, keys: keysWith('k'), audioPart });
    const segments = await provider.transcribe(['a.m4a'], { language: 'pt' });
    expect(segments).toEqual([{ text: 'oi tudo bem', startMs: 0, endMs: 1000 }]);
  });

  it('should keep non-numeric speaker ids as-is and handle empty audio', async () => {
    const odd = {
      language_code: 'pt',
      text: 'oi',
      words: [{ text: 'oi', start: 0, end: 0.3, type: 'word', speaker_id: 'host' }],
    };
    const httpOdd: HttpClient = jest.fn(async () => response(200, odd));
    const p1 = new ElevenLabsScribeProvider({ http: httpOdd, keys: keysWith('k'), audioPart });
    expect((await p1.transcribe(['a.m4a'], { language: 'pt' }))[0]?.speaker).toBe('host');

    const empty = { language_code: 'pt', text: '', words: [] };
    const httpEmpty: HttpClient = jest.fn(async () => response(200, empty));
    const p2 = new ElevenLabsScribeProvider({ http: httpEmpty, keys: keysWith('k'), audioPart });
    expect(await p2.transcribe(['a.m4a'], { language: 'pt' })).toEqual([]);
  });

  it('should throw MissingApiKeyError when no key is configured (TEST-12, REQ-11)', async () => {
    const provider = new ElevenLabsScribeProvider({ http: jest.fn(), keys: keysWith(null), audioPart });
    await expect(provider.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(MissingApiKeyError);
  });

  it('should throw ProviderApiError with status on API failure (TEST-12)', async () => {
    const http: HttpClient = jest.fn(async () => response(401, { detail: 'invalid api key' }));
    const provider = new ElevenLabsScribeProvider({ http, keys: keysWith('bad'), audioPart });
    await expect(provider.transcribe(['a.m4a'], { language: 'pt' })).rejects.toThrow(ProviderApiError);
    await expect(provider.transcribe(['a.m4a'], { language: 'pt' })).rejects.toMatchObject({ status: 401 });
  });
});
