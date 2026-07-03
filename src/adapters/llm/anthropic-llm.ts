import type { LlmExtractionInput, LlmPointCandidate, LlmProvider } from '../provider-ports';
import { MissingApiKeyError, ProviderApiError } from '../errors';
import { EXTRACTION_SYSTEM_PROMPT, parseCandidates } from './parse-candidates';
import type { LlmAdapterDeps } from './openai-llm';

interface MessagesResponse {
  content: { type: string; text?: string }[];
}

/** Anthropic (Messages API) — extração de pontos ao vivo (REQ-04/05/13). */
export class AnthropicLlmProvider implements LlmProvider {
  readonly id = 'anthropic-llm';

  constructor(
    private readonly deps: LlmAdapterDeps,
    // loop de extração roda a cada ~30s: modelo rápido/barato por padrão
    private readonly model = 'claude-haiku-4-5-20251001',
  ) {}

  async extractPoints(input: LlmExtractionInput): Promise<LlmPointCandidate[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const res = await this.deps.http('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: this.deps.extractionPrompt ?? EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(input) }],
      }),
    });
    if (!res.ok) throw new ProviderApiError(this.id, res.status, await res.text());

    const body = (await res.json()) as MessagesResponse;
    const text = body.content.find((c) => c.type === 'text')?.text ?? '';
    return parseCandidates(text);
  }
}
