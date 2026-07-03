import { OpenAiCompatibleLlmProvider } from '../../src/adapters/llm/openai-compatible-llm';
import { MissingApiKeyError, ProviderApiError } from '../../src/adapters/errors';
import type { HttpClient, HttpResponse } from '../../src/adapters/http';
import type { ApiKeyStore } from '../../src/adapters/secure-keys';
import type { LlmExtractionInput } from '../../src/adapters/provider-ports';

const candidatesJson = JSON.stringify({
  points: [
    {
      sectionId: 'problem',
      text: 'Requisitos se perdem em reunião',
      anchor: { segmentId: 't1', quote: 'perder requisitos' },
    },
  ],
});

const chatFixture = { choices: [{ message: { content: candidatesJson } }] };

function response(status: number, body: unknown): HttpResponse {
  return { ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

const keysWith = (key: string | null): ApiKeyStore => ({
  getKey: async () => key,
  setKey: async () => undefined,
  deleteKey: async () => undefined,
});

const input: LlmExtractionInput = {
  meetingTypeName: 'Levantamento de Requisitos',
  sections: [{ id: 'problem', title: 'Problema' }],
  transcript: [{ segmentId: 't1', text: 'nosso problema é perder requisitos' }],
};

/**
 * Provedores compatíveis com a Chat Completions API da OpenAI (REQ-13 amendment): DeepSeek,
 * OpenRouter e NVIDIA NIM têm todos esse mesmo formato — um adapter genérico parametrizado por
 * id/baseUrl/model evita duplicar a classe (ver `OpenAiLlmProvider` para o formato original).
 */
describe('OpenAiCompatibleLlmProvider (DeepSeek, OpenRouter, NVIDIA NIM — REQ-13)', () => {
  it('should call the configured baseUrl/model and parse extraction candidates', async () => {
    const http = jest.fn(async () => response(200, chatFixture));
    const provider = new OpenAiCompatibleLlmProvider(
      { http, keys: keysWith('dsk') },
      { id: 'deepseek-llm', baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    );

    const points = await provider.extractPoints(input);
    expect(points).toEqual([
      {
        sectionId: 'problem',
        text: 'Requisitos se perdem em reunião',
        anchor: { segmentId: 't1', quote: 'perder requisitos' },
      },
    ]);

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer dsk');
    expect(init.body).toContain('deepseek-chat');
    expect(init.body).toContain('somente trechos literais');
  });

  it('should expose the configured id (used by the provider catalog)', () => {
    const provider = new OpenAiCompatibleLlmProvider(
      { http: jest.fn(), keys: keysWith('k') },
      { id: 'openrouter-llm', baseUrl: 'https://openrouter.ai/api/v1/chat/completions', model: 'x' },
    );
    expect(provider.id).toBe('openrouter-llm');
  });

  it('should tolerate malformed model output instead of throwing', async () => {
    const http: HttpClient = jest.fn(async () =>
      response(200, { choices: [{ message: { content: 'não é json' } }] }),
    );
    const provider = new OpenAiCompatibleLlmProvider(
      { http, keys: keysWith('k') },
      { id: 'nvidia-llm', baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'x' },
    );
    expect(await provider.extractPoints(input)).toEqual([]);
  });

  it('should throw typed errors on missing key and API failure (TEST-12)', async () => {
    const cfg = { id: 'deepseek-llm', baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' };
    const noKey = new OpenAiCompatibleLlmProvider({ http: jest.fn(), keys: keysWith(null) }, cfg);
    await expect(noKey.extractPoints(input)).rejects.toThrow(MissingApiKeyError);

    const http: HttpClient = jest.fn(async () => response(429, { error: 'rate limit' }));
    const throttled = new OpenAiCompatibleLlmProvider({ http, keys: keysWith('k') }, cfg);
    await expect(throttled.extractPoints(input)).rejects.toThrow(ProviderApiError);
  });
});
