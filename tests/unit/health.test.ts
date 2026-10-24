import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeDbs, freshDb } from '../helpers/db';
import { GET } from '@/app/api/health/route';
import { resolveDriver, setDbForTests, type Db } from '@/db/client';

describe('GET /api/health', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDbs();
  });

  it('returns 200 when the database answers', async () => {
    await freshDb();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 503 and logs only the error class when the database fails', async () => {
    const failing = { execute: () => Promise.reject(new TypeError('postgres://user:secret@host failed')) };
    setDbForTests(failing as unknown as Db);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(503);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]?.[0])).not.toContain('secret');
    expect(String(log.mock.calls[0]?.[0])).toContain('TypeError');
  });
});

describe('resolveDriver', () => {
  it('uses Neon on Vercel', () => expect(resolveDriver({ VERCEL: '1' } as unknown as NodeJS.ProcessEnv)).toBe('neon'));
  it('requires an explicit driver elsewhere', () => {
    expect(() => resolveDriver({} as unknown as NodeJS.ProcessEnv)).toThrow(/DB_DRIVER/);
    expect(resolveDriver({ DB_DRIVER: 'pglite' } as unknown as NodeJS.ProcessEnv)).toBe('pglite');
  });
});

describe('users schema', () => {
  afterEach(closeDbs);

  it('rejects a duplicate email at the database (SQLSTATE 23505)', async () => {
    const { client } = await freshDb();
    await client.query(`insert into users (email) values ('a@example.test')`);
    await expect(client.query(`insert into users (email) values ('a@example.test')`)).rejects.toMatchObject({
      code: '23505',
    });
  });
});
