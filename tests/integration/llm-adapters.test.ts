import { OpenAiLlmProvider } from '../../src/adapters/llm/openai-llm';
import { AnthropicLlmProvider } from '../../src/adapters/llm/anthropic-llm';
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

const openAiFixture = { choices: [{ message: { content: candidatesJson } }] };
const anthropicFixture = { content: [{ type: 'text', text: candidatesJson }] };

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

describe('llm adapters contract (REQ-13)', () => {
  it('openai: should parse extraction candidates from a chat completion', async () => {
    const http = jest.fn(async () => response(200, openAiFixture));
    const provider = new OpenAiLlmProvider({ http, keys: keysWith('sk') });

    const points = await provider.extractPoints(input);
    expect(points).toEqual([
      {
        sectionId: 'problem',
        text: 'Requisitos se perdem em reunião',
        anchor: { segmentId: 't1', quote: 'perder requisitos' },
      },
    ]);

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers['Authorization']).toBe('Bearer sk');
    // instrução anti-alucinação viaja no prompt
    expect(init.body).toContain('CURTO e LITERAL');
  });

  it('anthropic: should parse extraction candidates from a messages response', async () => {
    const http = jest.fn(async () => response(200, anthropicFixture));
    const provider = new AnthropicLlmProvider({ http, keys: keysWith('ak') });

    const points = await provider.extractPoints(input);
    expect(points).toHaveLength(1);

    const [url, init] = http.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('ak');
  });

  it('should return no candidates for malformed model output instead of throwing (tolerância)', async () => {
    const http: HttpClient = jest.fn(async () =>
      response(200, { choices: [{ message: { content: 'não é json' } }] }),
    );
    const provider = new OpenAiLlmProvider({ http, keys: keysWith('sk') });
    expect(await provider.extractPoints(input)).toEqual([]);
  });

  it('should drop individually-invalid candidates and tolerate empty model responses', async () => {
    const mixed = JSON.stringify({
      points: [
        { sectionId: 'problem', text: 'válido', anchor: { segmentId: 't1', quote: 'q' } },
        { sectionId: 'problem', text: 'sem âncora' },
        { text: 'sem seção', anchor: { segmentId: 't1', quote: 'q' } },
        'nem é objeto',
      ],
    });
    const httpMixed: HttpClient = jest.fn(async () =>
      response(200, { choices: [{ message: { content: mixed } }] }),
    );
    expect(await new OpenAiLlmProvider({ http: httpMixed, keys: keysWith('sk') }).extractPoints(input)).toHaveLength(1);

    const httpNoChoices: HttpClient = jest.fn(async () => response(200, { choices: [] }));
    expect(await new OpenAiLlmProvider({ http: httpNoChoices, keys: keysWith('sk') }).extractPoints(input)).toEqual([]);

    const httpNoText: HttpClient = jest.fn(async () => response(200, { content: [{ type: 'tool_use' }] }));
    expect(await new AnthropicLlmProvider({ http: httpNoText, keys: keysWith('ak') }).extractPoints(input)).toEqual([]);

    const httpNoPoints: HttpClient = jest.fn(async () =>
      response(200, { choices: [{ message: { content: '{"outra":true}' } }] }),
    );
    expect(await new OpenAiLlmProvider({ http: httpNoPoints, keys: keysWith('sk') }).extractPoints(input)).toEqual([]);
  });

  it('should accept a model override per adapter (configuração por provedor)', async () => {
    const http = jest.fn(async () => response(200, anthropicFixture));
    await new AnthropicLlmProvider({ http, keys: keysWith('ak') }, 'claude-sonnet-5').extractPoints(input);
    const [, init] = http.mock.calls[0] as unknown as [string, { body: string }];
    expect(init.body).toContain('claude-sonnet-5');
  });

  it('should throw typed errors on missing key and API failure (TEST-12)', async () => {
    const noKey = new OpenAiLlmProvider({ http: jest.fn(), keys: keysWith(null) });
    await expect(noKey.extractPoints(input)).rejects.toThrow(MissingApiKeyError);

    const http: HttpClient = jest.fn(async () => response(429, { error: 'rate limit' }));
    const throttled = new AnthropicLlmProvider({ http, keys: keysWith('ak') });
    await expect(throttled.extractPoints(input)).rejects.toMatchObject({ status: 429 });
    await expect(throttled.extractPoints(input)).rejects.toThrow(ProviderApiError);
  });
});
