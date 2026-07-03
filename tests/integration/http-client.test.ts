import { createHttpClient, type XhrLike } from '../../src/adapters/http';

/** Fake XHR controlável: dispara onload manualmente após `send`. */
function fakeXhr(status: number, responseText: string) {
  const setHeaders: Record<string, string> = {};
  const sent: { method?: string; url?: string; body?: unknown } = {};
  const xhr: XhrLike = {
    open(method, url) {
      sent.method = method;
      sent.url = url;
    },
    setRequestHeader(name, value) {
      setHeaders[name] = value;
    },
    send(body) {
      sent.body = body;
      xhr.status = status;
      xhr.responseText = responseText;
      xhr.onload?.();
    },
    onload: null,
    onerror: null,
    status: 0,
    responseText: '',
  };
  return { xhr, sent, setHeaders };
}

describe('createHttpClient (TRB-005: FormData precisa ir por XHR, não por fetch)', () => {
  it('should send FormData bodies via XMLHttpRequest instead of fetch', async () => {
    const fetchImpl = jest.fn();
    const { xhr, sent, setHeaders } = fakeXhr(200, '{"ok":true}');
    const http = createHttpClient({ fetchImpl, xhrFactory: () => xhr });

    const form = new FormData();
    form.append('file', 'fake-part' as never);

    const res = await http('https://api.example.com/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer x' },
      body: form,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(sent.method).toBe('POST');
    expect(sent.url).toBe('https://api.example.com/upload');
    expect(sent.body).toBe(form);
    expect(setHeaders.Authorization).toBe('Bearer x');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('should reject when the XHR request errors', async () => {
    const fetchImpl = jest.fn();
    const xhr: XhrLike = {
      open: () => undefined,
      setRequestHeader: () => undefined,
      send() {
        xhr.onerror?.();
      },
      onload: null,
      onerror: null,
      status: 0,
      responseText: '',
    };
    const http = createHttpClient({ fetchImpl, xhrFactory: () => xhr });

    const form = new FormData();
    await expect(http('https://api.example.com/upload', { method: 'POST', body: form })).rejects.toThrow(
      'Network request failed',
    );
  });

  it('should send non-FormData bodies via fetch, not XHR', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), text: async () => '' });
    const xhrFactory = jest.fn();
    const http = createHttpClient({ fetchImpl, xhrFactory });

    await http('https://api.example.com/chat', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(xhrFactory).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/chat', {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
  });
});
