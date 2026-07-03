/** Erros tipados dos adapters (TEST-12): a camada de serviço decide degradar, nunca quebra a sessão. */

export class MissingApiKeyError extends Error {
  constructor(public readonly providerId: string) {
    super(`Chave de API não configurada para o provedor "${providerId}"`);
    this.name = 'MissingApiKeyError';
  }
}

export class ProviderApiError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly status: number,
    detail: string,
  ) {
    super(`Provedor "${providerId}" respondeu ${status}: ${detail}`);
    this.name = 'ProviderApiError';
  }
}
