import type { LlmExtractionInput, LlmPointCandidate, LlmProvider } from '../provider-ports';
import type { HttpClient } from '../http';
import type { ApiKeyStore } from '../secure-keys';
import { MissingApiKeyError, ProviderApiError } from '../errors';
import { EXTRACTION_SYSTEM_PROMPT, parseCandidates } from './parse-candidates';

export interface LlmAdapterDeps {
  http: HttpClient;
  keys: ApiKeyStore;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/** OpenAI (Chat Completions) — extração de pontos ao vivo (REQ-04/05/13). */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id = 'openai-llm';

  constructor(
    private readonly deps: LlmAdapterDeps,
    private readonly model = 'gpt-4o-mini',
  ) {}

  async extractPoints(input: LlmExtractionInput): Promise<LlmPointCandidate[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const res = await this.deps.http('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(input) },
        ],
      }),
    });
    if (!res.ok) throw new ProviderApiError(this.id, res.status, await res.text());

    const body = (await res.json()) as ChatCompletionResponse;
    return parseCandidates(body.choices[0]?.message.content ?? '');
  }
}
