// Browser-side calls to the Users API. Never sends the admin token: the profile step relies on the
// HttpOnly cookie that POST /users sets.
import type { ApiError, User } from '@/contracts/users';

export const REQUEST_TIMEOUT_MS = 10_000;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'http'; status: number; error: ApiError['error'] }
  | { ok: false; kind: 'timeout' }
  | { ok: false; kind: 'network' };

async function send<T>(
  path: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResult<T>> {
  // setTimeout (not AbortSignal.timeout) so tests can drive the clock.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as (T & Partial<ApiError>) | null;
    if (res.ok && json) return { ok: true, data: json };
    if (json?.error) return { ok: false, kind: 'http', status: res.status, error: json.error };
    return { ok: false, kind: 'http', status: res.status, error: { code: 'INTERNAL', message: '', requestId: '' } };
  } catch {
    return timedOut ? { ok: false, kind: 'timeout' } : { ok: false, kind: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/** The same idempotency key must be reused for retries of one signup attempt. */
export const createUser = (email: string, idempotencyKey: string) =>
  send<{ user: User }>('/users', 'POST', { email }, { 'idempotency-key': idempotencyKey });

export const updateProfile = (id: string, changes: Record<string, unknown>) =>
  send<{ user: User }>(`/users/${id}`, 'PATCH', changes);
