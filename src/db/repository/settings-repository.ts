import type { SqlDatabase } from '../database';
import {
  DEFAULT_PROVIDERS,
  getProviderDescriptor,
  UnknownProviderError,
  type ProviderCapability,
} from '../../adapters/provider-catalog';
import { EXTRACTION_GUIDANCE } from '../../adapters/llm/parse-candidates';

const EXTRACTION_PROMPT_KEY = 'prompt.extraction';

/** Key-value de configurações do app; guarda a seleção de provedor por capacidade (REQ-13). */
export class SettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }

  async getSelectedProvider(capability: ProviderCapability): Promise<string> {
    return (await this.get(`provider.${capability}`)) ?? DEFAULT_PROVIDERS[capability];
  }

  /** Valida contra o catálogo: id inexistente ou de outra capacidade é rejeitado. */
  async setSelectedProvider(capability: ProviderCapability, providerId: string): Promise<void> {
    const descriptor = getProviderDescriptor(providerId);
    if (descriptor.capability !== capability) {
      throw new UnknownProviderError(providerId, capability);
    }
    await this.set(`provider.${capability}`, providerId);
  }

  /**
   * Guidance de extração editável (REQ-13): só a parte "o que extrair". O contrato de formato/
   * anti-alucinação é sempre injetado pelo código (buildExtractionPrompt), não fica aqui.
   */
  async getExtractionPrompt(): Promise<string> {
    const custom = (await this.get(EXTRACTION_PROMPT_KEY))?.trim();
    return custom && custom.length > 0 ? custom : EXTRACTION_GUIDANCE;
  }

  /** Guidance em branco cai no padrão (getter) — nunca deixa a extração sem instrução. */
  async setExtractionPrompt(prompt: string): Promise<void> {
    await this.set(EXTRACTION_PROMPT_KEY, prompt);
  }

  async resetExtractionPrompt(): Promise<void> {
    await this.set(EXTRACTION_PROMPT_KEY, '');
  }
}
