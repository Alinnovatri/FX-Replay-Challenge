import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDbs, freshDb } from '../helpers/db';
import type { PGlite } from '@electric-sql/pglite';
import { GET, POST } from '@/app/users/route';
import { PATCH } from '@/app/users/[id]/route';
import { setSinkForTests, type CapturedEvent } from '@/server/analytics';
import { PROFILE_COOKIE, signProfileToken } from '@/server/auth';
import { setDbForTests, type Db } from '@/db/client';

const BASE = 'https://app.test';
const ADMIN = { authorization: 'Bearer test-admin-token' };
const events: { name: string; userId?: unknown; fieldsCount?: unknown }[] = [];
const captured: CapturedEvent[] = [];

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request(`${BASE}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

function patch(id: string, body: unknown, headers: Record<string, string> = {}) {
  return PATCH(
    new Request(`${BASE}/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

const list = (query = '', headers: Record<string, string> = ADMIN) =>
  GET(new Request(`${BASE}/users${query}`, { headers }));

/** Turns a Set-Cookie header into the Cookie header a browser would send back. */
const cookieFrom = (res: Response) => ({ cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '' });

async function signUp(email = 'trader@example.test') {
  const res = await post({ email });
  const { user } = (await res.json()) as { user: { id: string } };
  return { res, user, cookie: cookieFrom(res) };
}

let client: PGlite;

beforeEach(async () => {
  ({ client } = await freshDb());
  events.length = 0;
  captured.length = 0;
  setSinkForTests(async (event) => {
    captured.push(event);
    const summary: { name: string; userId?: unknown; fieldsCount?: unknown } = {
      name: event.event,
      userId: event.properties.user_id,
    };
    if (event.properties.fields_count !== undefined) summary.fieldsCount = event.properties.fields_count;
    events.push(summary);
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await closeDbs();
});

describe('POST /users', () => {
  it('creates a user, sets the self-service cookie and tracks the conversion once', async () => {
    const res = await post({ email: '  Trader@Example.TEST ' });
    expect(res.status).toBe(201);
    const { user } = await res.json();
    expect(user).toMatchObject({ email: 'trader@example.test', firstName: null, markets: null });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(new RegExp(`^${PROFILE_COOKIE}=`));
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=1800']) {
      expect(cookie).toContain(attribute);
    }
    expect(events).toEqual([{ name: 'user_signed_up', userId: user.id }]);
  });

  it('tags the conversion with the visitor id, variant and test flag', async () => {
    const aid = '11111111-1111-4111-8111-111111111111';
    await post({ email: 'real@trader.example' }, { cookie: `__Host-fxr_aid=${aid}; __Host-fxr_variant=quiz` });
    expect(captured.at(-1)).toMatchObject({
      event: 'user_signed_up',
      distinctId: aid,
      properties: { variant: 'quiz', is_test: false, has_visitor_id: true, source: 'server' },
    });
    await post({ email: 'smoke@example.test' });
    expect(captured.at(-1)?.properties).toMatchObject({ is_test: true, variant: null, has_visitor_id: false });
    expect(JSON.stringify(captured)).not.toContain('@');
  });

  it('saves quiz answers sent with the signup', async () => {
    const res = await post({
      email: 'quiz@example.test',
      firstName: ' Ana ',
      experienceLevel: 'beginner',
      markets: ['forex', 'metals'],
    });
    expect(res.status).toBe(201);
    expect((await res.json()).user).toMatchObject({
      firstName: 'Ana',
      experienceLevel: 'beginner',
      markets: ['forex', 'metals'],
    });
    expect((await post({ email: 'bad@example.test', experienceLevel: 'expert' })).status).toBe(400);
  });

  it('returns 409 EMAIL_TAKEN for a duplicate, case-insensitively, without a second event', async () => {
    await post({ email: 'dup@example.test' });
    const res = await post({ email: 'DUP@example.test' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatchObject({ code: 'EMAIL_TAKEN', requestId: expect.any(String) });
    expect(events).toHaveLength(1);
  });

  it('returns 400 with per-field messages for invalid input and unknown fields', async () => {
    const res = await post({ email: 'not-an-email', name: 'x' });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.fields).toMatchObject({ email: expect.any(String), name: 'Unknown field' });
    expect(events).toHaveLength(0);
  });

  it('returns 400 for malformed JSON and a missing content type', async () => {
    expect((await post('{nope')).status).toBe(400);
    const noType = await POST(new Request(`${BASE}/users`, { method: 'POST', body: '{}' }));
    expect(noType.status).toBe(400);
  });

  it('replays the original 201 for a retry with the same Idempotency-Key and body', async () => {
    const key = crypto.randomUUID();
    const first = await post({ email: 'retry@example.test' }, { 'idempotency-key': key });
    const second = await post({ email: 'retry@example.test' }, { 'idempotency-key': key });
    expect(second.status).toBe(201);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(second.headers.get('location')).toBe(first.headers.get('location'));
    expect((await second.json()).user.id).toBe((await first.json()).user.id);
    expect(events).toHaveLength(1);
  });

  it('stops replaying, and stops issuing cookies, once the key is older than the cookie lifetime', async () => {
    const key = crypto.randomUUID();
    await post({ email: 'old@example.test' }, { 'idempotency-key': key });
    await client.query(`update idempotency_keys set created_at = now() - interval '31 minutes'`);
    const res = await post({ email: 'old@example.test' }, { 'idempotency-key': key });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('EMAIL_TAKEN');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('still returns 201 and tracks the conversion when storing the idempotency record fails', async () => {
    // Lookups still work; only storing the replay record fails, after the user row is committed.
    await client.exec(`create function reject_insert() returns trigger language plpgsql as $$
      begin raise exception 'storage unavailable'; end $$;
      create trigger reject_idempotency before insert on idempotency_keys for each row execute function reject_insert();`);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ email: 'kept@example.test' }, { 'idempotency-key': crypto.randomUUID() });
    expect(res.status).toBe(201);
    expect(events.map((e) => e.name)).toEqual(['user_signed_up']);
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('idempotency_store_failed'))).toBe(true);
    expect(lines.join('')).not.toContain('kept@example.test');
  });

  it('returns 201 even when the analytics sink throws, logging no personal data', async () => {
    setSinkForTests(async () => {
      throw new Error('posthog down for kept@example.test');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ email: 'kept@example.test' });
    expect(res.status).toBe(201);
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: 'analytics_failed', name: 'user_signed_up', errorClass: 'Error' });
    expect(line).not.toContain('kept@example.test');
  });

  it('rejects an oversized body', async () => {
    const res = await post({ email: `${'a'.repeat(10_050)}@example.test` });
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/too large/);
  });

  it('returns 409 IDEMPOTENCY_CONFLICT when a key is reused with a different body', async () => {
    const key = crypto.randomUUID();
    await post({ email: 'a@example.test' }, { 'idempotency-key': key });
    const res = await post({ email: 'b@example.test' }, { 'idempotency-key': key });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(events).toHaveLength(1);
  });

  it('returns 500 with a generic message and logs only the error class and SQLSTATE', async () => {
    const failing = {
      insert: () => ({
        values: () => ({
          returning: () =>
            Promise.reject(Object.assign(new Error('insert into users trader@example.test'), { code: '08006' })),
        }),
      }),
    };
    setDbForTests(failing as unknown as Db);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ email: 'trader@example.test' });
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('INTERNAL');
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({ event: 'request_failed', errorClass: 'Error', sqlstate: '08006' });
    expect(line).not.toContain('example.test');
    expect(events).toHaveLength(0);
  });
});

describe('GET /users', () => {
  it('requires the admin token', async () => {
    expect((await list('', {})).status).toBe(401);
    expect((await list('', { authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('pages newest first with a stable cursor', async () => {
    // Explicit, distinct timestamps: back-to-back inserts can share created_at, and ties order by id.
    await client.query(`insert into users (email, created_at) values
      ('u1@example.test', '2026-10-24 08:00:01+00'),
      ('u2@example.test', '2026-10-24 08:00:02+00'),
      ('u3@example.test', '2026-10-24 08:00:03+00')`);
    const first = await (await list('?limit=2')).json();
    expect(first.users.map((u: { email: string }) => u.email)).toEqual(['u3@example.test', 'u2@example.test']);
    const second = await (await list(`?limit=2&cursor=${first.nextCursor}`)).json();
    expect(second.users.map((u: { email: string }) => u.email)).toEqual(['u1@example.test']);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects an out-of-range limit and a bad cursor, including a non-UUID id that Postgres would reject', async () => {
    expect((await list('?limit=101')).status).toBe(400);
    expect((await list('?cursor=garbage')).status).toBe(400);
    const forged = Buffer.from(JSON.stringify({ createdAt: '2026-10-24 08:00:00.000001+00', id: 'nope' })).toString(
      'base64url',
    );
    expect((await list(`?cursor=${forged}`)).status).toBe(400);
  });

  it('does not skip rows whose timestamps differ only below the millisecond', async () => {
    await client.query(`insert into users (email, created_at) values
      ('a@example.test', '2026-10-24 08:00:00.123400+00'),
      ('b@example.test', '2026-10-24 08:00:00.123450+00'),
      ('c@example.test', '2026-10-24 08:00:00.123500+00')`);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: { users: { email: string }[]; nextCursor: string | null } = await (
        await list(`?limit=1${cursor ? `&cursor=${cursor}` : ''}`)
      ).json();
      seen.push(...page.users.map((u) => u.email));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual(['c@example.test', 'b@example.test', 'a@example.test']);
  });
});

describe('PATCH /users/:id', () => {
  it('lets the self-service cookie update profile fields and tracks profile_completed', async () => {
    const { user, cookie } = await signUp();
    const res = await patch(
      user.id,
      { firstName: 'Ana', experienceLevel: 'beginner', markets: ['forex', 'crypto'] },
      cookie,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({
      firstName: 'Ana',
      experienceLevel: 'beginner',
      markets: ['forex', 'crypto'],
    });
    expect(events.at(-1)).toEqual({ name: 'profile_completed', userId: user.id, fieldsCount: 3 });
  });

  it('forbids the cookie from changing email or another user', async () => {
    const { user, cookie } = await signUp('one@example.test');
    const other = await signUp('two@example.test');
    expect((await patch(user.id, { email: 'x@example.test' }, cookie)).status).toBe(403);
    expect((await patch(user.id, { email: 'not-an-email' }, cookie)).status).toBe(403);
    expect((await patch(other.user.id, { firstName: 'Eve' }, cookie)).status).toBe(403);
  });

  it('rejects a missing, tampered or expired cookie with 401', async () => {
    const { user, cookie } = await signUp();
    expect((await patch(user.id, { firstName: 'Ana' })).status).toBe(401);
    expect((await patch(user.id, { firstName: 'Ana' }, { cookie: `${cookie.cookie}x` })).status).toBe(401);
    expect((await patch(user.id, { firstName: 'Ana' }, { cookie: `${cookie.cookie}.extra` })).status).toBe(401);
    const expired = signProfileToken(user.id, Date.now() - 31 * 60 * 1000);
    expect((await patch(user.id, { firstName: 'Ana' }, { cookie: `${PROFILE_COOKIE}=${expired}` })).status).toBe(401);
  });

  it('lets the admin change email, with 409 on a taken email and 404 for an unknown id', async () => {
    const { user } = await signUp('old@example.test');
    await signUp('taken@example.test');
    const res = await patch(user.id, { email: 'New@Example.test' }, ADMIN);
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe('new@example.test');
    expect((await patch(user.id, { email: 'taken@example.test' }, ADMIN)).status).toBe(409);
    expect((await patch(crypto.randomUUID(), { firstName: 'Ana' }, ADMIN)).status).toBe(404);
    expect((await patch('not-a-uuid', { firstName: 'Ana' }, ADMIN)).status).toBe(404);
  });

  it('rejects invalid values and an empty body with 400', async () => {
    const { user, cookie } = await signUp();
    expect((await patch(user.id, { experienceLevel: 'expert' }, cookie)).status).toBe(400);
    expect((await patch(user.id, { markets: ['options'] }, cookie)).status).toBe(400);
    expect((await patch(user.id, {}, cookie)).status).toBe(400);
  });
});

describe('configuration', () => {
  it('fails with a 500 before creating anything when SESSION_SECRET is missing', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ email: 'nosecret@example.test' });
    expect(res.status).toBe(500);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      errorClass: 'ConfigError',
      setting: 'SESSION_SECRET',
    });
    vi.unstubAllEnvs();
    // The account was not created: the same email signs up normally once the secret is back.
    expect((await post({ email: 'nosecret@example.test' })).status).toBe(201);
  });

  it('fails loudly with a 500 when ADMIN_TOKEN is missing, naming the setting in the log only', async () => {
    vi.stubEnv('ADMIN_TOKEN', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await list();
    expect(res.status).toBe(500);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      errorClass: 'ConfigError',
      setting: 'ADMIN_TOKEN',
    });
    vi.unstubAllEnvs();
  });
});
