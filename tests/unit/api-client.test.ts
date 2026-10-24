import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUser, REQUEST_TIMEOUT_MS } from '@/lib/api';

const KEY = '00000000-0000-4000-8000-000000000000';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('browser API client', () => {
  it('returns the user on a 201 with the expected body', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ user: { id: 'u1' } }, { status: 201 }));
    expect(await createUser('a@example.test', KEY)).toEqual({ ok: true, data: { user: { id: 'u1' } } });
  });

  it('treats a 2xx without a user as an error, not a success', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 200 }));
    expect(await createUser('a@example.test', KEY)).toMatchObject({
      ok: false,
      kind: 'http',
      error: { code: 'INTERNAL' },
    });
    vi.stubGlobal('fetch', async () => Response.json({}, { status: 201 }));
    expect(await createUser('a@example.test', KEY)).toMatchObject({ ok: false, kind: 'http' });
  });

  it('maps a non-JSON 502 to a generic INTERNAL error', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await createUser('a@example.test', KEY)).toMatchObject({
      ok: false,
      kind: 'http',
      status: 502,
      error: { code: 'INTERNAL' },
    });
  });

  it('passes API errors through', async () => {
    const error = { code: 'EMAIL_TAKEN', message: 'taken', requestId: 'r' };
    vi.stubGlobal('fetch', async () => Response.json({ error }, { status: 409 }));
    expect(await createUser('a@example.test', KEY)).toEqual({ ok: false, kind: 'http', status: 409, error });
  });

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await createUser('a@example.test', KEY)).toEqual({ ok: false, kind: 'network' });
  });

  it('reports a timeout when the request outlives the limit', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
        ),
    );
    const pending = createUser('a@example.test', KEY);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ ok: false, kind: 'timeout' });
  });

  it('sends the Idempotency-Key header', async () => {
    const fetchMock = vi.fn(async () => Response.json({ user: { id: 'u1' } }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await createUser('a@example.test', KEY);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe(KEY);
  });
});
