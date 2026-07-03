import type { LlmProvider, SttBatchProvider } from './provider-ports';
import { ElevenLabsScribeProvider, type SttAdapterDeps } from './stt/elevenlabs-scribe';
import { OpenAiWhisperProvider } from './stt/openai-whisper';
import { OpenAiLlmProvider, type LlmAdapterDeps } from './llm/openai-llm';
import { AnthropicLlmProvider } from './llm/anthropic-llm';

export type ProviderCapability = 'stt-batch' | 'llm';

export interface ProviderDescriptor {
  id: string;
  label: string;
  capability: ProviderCapability;
  /** Presente em provedores STT — false dispara o aviso pré-reunião (US-10.3). */
  supportsDiarization?: boolean;
}

export class UnknownProviderError extends Error {
  constructor(id: string, capability?: ProviderCapability) {
    super(
      capability
        ? `Provedor "${id}" não existe para a capacidade "${capability}"`
        : `Provedor "${id}" não existe no catálogo`,
    );
    this.name = 'UnknownProviderError';
  }
}

/**
 * Catálogo de provedores (ADR-005, REQ-13): adicionar um provedor = nova classe adapter
 * + uma linha aqui. Nenhum código fora de `src/adapters/` conhece HTTP/SDKs.
 */
export const PROVIDERS: ProviderDescriptor[] = [
  { id: 'elevenlabs-scribe', label: 'ElevenLabs Scribe', capability: 'stt-batch', supportsDiarization: true },
  { id: 'openai-whisper', label: 'OpenAI Whisper', capability: 'stt-batch', supportsDiarization: false },
  { id: 'openai-llm', label: 'OpenAI (GPT)', capability: 'llm' },
  { id: 'anthropic-llm', label: 'Anthropic (Claude)', capability: 'llm' },
];

/** Seleção padrão por capacidade quando o usuário ainda não escolheu (REQ-12 pede diarização). */
export const DEFAULT_PROVIDERS: Record<ProviderCapability, string> = {
  'stt-batch': 'elevenlabs-scribe',
  llm: 'anthropic-llm',
};

export function listProviders(capability: ProviderCapability): ProviderDescriptor[] {
  return PROVIDERS.filter((p) => p.capability === capability);
}

export function getProviderDescriptor(id: string): ProviderDescriptor {
  const descriptor = PROVIDERS.find((p) => p.id === id);
  if (!descriptor) throw new UnknownProviderError(id);
  return descriptor;
}

export function createSttProvider(id: string, deps: SttAdapterDeps): SttBatchProvider {
  switch (id) {
    case 'elevenlabs-scribe':
      return new ElevenLabsScribeProvider(deps);
    case 'openai-whisper':
      return new OpenAiWhisperProvider(deps);
    default:
      throw new UnknownProviderError(id, 'stt-batch');
  }
}

export function createLlmProvider(id: string, deps: LlmAdapterDeps): LlmProvider {
  switch (id) {
    case 'openai-llm':
      return new OpenAiLlmProvider(deps);
    case 'anthropic-llm':
      return new AnthropicLlmProvider(deps);
    default:
      throw new UnknownProviderError(id, 'llm');
  }
}
