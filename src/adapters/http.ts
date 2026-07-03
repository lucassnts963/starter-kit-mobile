/**
 * Port HTTP dos adapters (NFR-03: rede só existe em `src/adapters/`).
 * Produção: `globalThis.fetch` (React Native) satisfaz o tipo estruturalmente.
 * Testes: função fake com fixtures por provedor.
 */

export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface HttpRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export type HttpClient = (url: string, init: HttpRequestInit) => Promise<HttpResponse>;
