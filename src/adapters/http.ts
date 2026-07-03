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

/** Subconjunto de XMLHttpRequest usado por `createHttpClient` (mockável em teste). */
export interface XhrLike {
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: unknown): void;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  status: number;
  responseText: string;
}

export interface CreateHttpClientDeps {
  fetchImpl: HttpClient;
  xhrFactory: () => XhrLike;
}

/**
 * TRB-005: o `fetch` global do React Native vem de `whatwg-fetch`, que não entende o formato
 * de arquivo `{uri,name,type}` que o RN usa em `FormData` para native file uploads (só aceita
 * Blob/File reais) — falha em runtime com "Unsupported FormDataPart implementation". Corpos
 * `FormData` (upload de áudio para STT) vão por `XMLHttpRequest`, que ainda usa o bridge nativo
 * do RN e entende esse formato; o resto (JSON) segue por `fetch` normalmente.
 */
export function createHttpClient(deps: CreateHttpClientDeps): HttpClient {
  return (url, init) => {
    if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
      return sendViaXhr(deps.xhrFactory, url, init);
    }
    return deps.fetchImpl(url, init);
  };
}

function sendViaXhr(xhrFactory: () => XhrLike, url: string, init: HttpRequestInit): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = xhrFactory();
    xhr.open(init.method ?? 'GET', url);
    for (const [name, value] of Object.entries(init.headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: async () => xhr.responseText,
        json: async () => JSON.parse(xhr.responseText),
      });
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.send(init.body);
  });
}
