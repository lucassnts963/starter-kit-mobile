import type { LlmExtractionInput, LlmPointCandidate, LlmProvider } from '../provider-ports';
import type { HttpClient } from '../http';
import type { ApiKeyStore } from '../secure-keys';
import { MissingApiKeyError, ProviderApiError } from '../errors';
import { EXTRACTION_SYSTEM_PROMPT, parseCandidates } from './parse-candidates';

export interface LlmAdapterDeps {
  http: HttpClient;
  keys: ApiKeyStore;
  /** Prompt de sistema da extração — configurável pelo usuário; default: EXTRACTION_SYSTEM_PROMPT. */
  extractionPrompt?: string;
}

export interface OpenAiCompatibleLlmConfig {
  id: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/**
 * Provedores compatíveis com a Chat Completions API da OpenAI (REQ-13 amendment) — DeepSeek,
 * OpenRouter e NVIDIA NIM (build.nvidia.com) usam o mesmo formato de requisição/resposta que
 * `OpenAiLlmProvider`, só mudando baseUrl/model; um adapter parametrizado evita duplicar a classe.
 */
export class OpenAiCompatibleLlmProvider implements LlmProvider {
  readonly id: string;

  constructor(
    private readonly deps: LlmAdapterDeps,
    private readonly config: OpenAiCompatibleLlmConfig,
  ) {
    this.id = config.id;
  }

  async extractPoints(input: LlmExtractionInput): Promise<LlmPointCandidate[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const res = await this.deps.http(this.config.baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.deps.extractionPrompt ?? EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(input) },
        ],
      }),
    });
    if (!res.ok) throw new ProviderApiError(this.id, res.status, await res.text());

    const body = (await res.json()) as ChatCompletionResponse;
    return parseCandidates(body.choices[0]?.message.content ?? '');
  }
}
