import type { LlmProvider, SttBatchProvider } from './provider-ports';
import { ElevenLabsScribeProvider, type SttAdapterDeps } from './stt/elevenlabs-scribe';
import { OpenAiWhisperProvider } from './stt/openai-whisper';
import { OpenAiCompatibleWhisperProvider, type OpenAiCompatibleWhisperConfig } from './stt/openai-compatible-whisper';
import { OpenAiLlmProvider, type LlmAdapterDeps } from './llm/openai-llm';
import { AnthropicLlmProvider } from './llm/anthropic-llm';
import { OpenAiCompatibleLlmProvider, type OpenAiCompatibleLlmConfig } from './llm/openai-compatible-llm';

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
 * Provedores LLM compatíveis com a Chat Completions API da OpenAI (REQ-13 amendment) —
 * DeepSeek, OpenRouter e NVIDIA NIM (build.nvidia.com) têm todos free tier ou custo muito baixo,
 * alternativa a OpenAI/Anthropic para quem quer eliminar/reduzir custo de API paga.
 */
const OPENAI_COMPATIBLE_LLM_CONFIGS: Record<string, OpenAiCompatibleLlmConfig> = {
  'deepseek-llm': { id: 'deepseek-llm', baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  'openrouter-llm': {
    id: 'openrouter-llm',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-chat-v3.1:free',
  },
  'nvidia-llm': {
    id: 'nvidia-llm',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.1-8b-instruct',
  },
};

/** STT compatível com /audio/transcriptions da OpenAI — Groq hospeda Whisper large-v3 free tier. */
const OPENAI_COMPATIBLE_STT_CONFIGS: Record<string, OpenAiCompatibleWhisperConfig> = {
  'groq-whisper': { id: 'groq-whisper', baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3' },
};

/**
 * Catálogo de provedores (ADR-005, REQ-13): adicionar um provedor = nova classe adapter
 * + uma linha aqui. Nenhum código fora de `src/adapters/` conhece HTTP/SDKs.
 */
export const PROVIDERS: ProviderDescriptor[] = [
  { id: 'elevenlabs-scribe', label: 'ElevenLabs Scribe', capability: 'stt-batch', supportsDiarization: true },
  { id: 'openai-whisper', label: 'OpenAI Whisper', capability: 'stt-batch', supportsDiarization: false },
  { id: 'groq-whisper', label: 'Groq (Whisper large-v3, gratuito/barato)', capability: 'stt-batch', supportsDiarization: false },
  { id: 'openai-llm', label: 'OpenAI (GPT)', capability: 'llm' },
  { id: 'anthropic-llm', label: 'Anthropic (Claude)', capability: 'llm' },
  { id: 'deepseek-llm', label: 'DeepSeek (custo muito baixo)', capability: 'llm' },
  { id: 'openrouter-llm', label: 'OpenRouter (agrega modelos, tem tier gratuito)', capability: 'llm' },
  { id: 'nvidia-llm', label: 'NVIDIA NIM (build.nvidia.com, gratuito)', capability: 'llm' },
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
    default: {
      const config = OPENAI_COMPATIBLE_STT_CONFIGS[id];
      if (!config) throw new UnknownProviderError(id, 'stt-batch');
      return new OpenAiCompatibleWhisperProvider(deps, config);
    }
  }
}

export function createLlmProvider(id: string, deps: LlmAdapterDeps): LlmProvider {
  switch (id) {
    case 'openai-llm':
      return new OpenAiLlmProvider(deps);
    case 'anthropic-llm':
      return new AnthropicLlmProvider(deps);
    default: {
      const config = OPENAI_COMPATIBLE_LLM_CONFIGS[id];
      if (!config) throw new UnknownProviderError(id, 'llm');
      return new OpenAiCompatibleLlmProvider(deps, config);
    }
  }
}
