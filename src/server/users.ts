import 'server-only';
import { createHash } from 'node:crypto';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import type { AdminUpdateInput, User } from '@/contracts/users';
import { getDb } from '@/db/client';
import { idempotencyKeys, users } from '@/db/schema';
import { PROFILE_COOKIE_MAX_AGE } from './auth';
import { HttpError, sqlstate } from './http';

type Row = typeof users.$inferSelect;

export function toUser(row: Row): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    experienceLevel: row.experienceLevel as User['experienceLevel'],
    markets: row.markets as User['markets'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const requestHash = (body: unknown) => createHash('sha256').update(JSON.stringify(body)).digest('hex');

const emailTaken = () => new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

/**
 * A stored response for this key, only while it is younger than the profile cookie lifetime. A replay re-issues
 * the self-service cookie, so an old key must not keep minting cookies (the cookie is bound to ~30 minutes).
 */
export async function findIdempotent(key: string) {
  const windowStart = new Date(Date.now() - PROFILE_COOKIE_MAX_AGE * 1000);
  const [row] = await getDb()
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), gt(idempotencyKeys.createdAt, windowStart)))
    .limit(1);
  return row;
}

export async function createUser(email: string): Promise<User> {
  try {
    const [row] = await getDb().insert(users).values({ email }).returning();
    if (!row) throw new Error('insert returned no row');
    return toUser(row);
  } catch (error) {
    if (sqlstate(error) === '23505') throw emailTaken();
    throw error;
  }
}

export async function rememberIdempotent(key: string, hash: string, user: User): Promise<void> {
  // Expired keys are useless after the replay window; prune them as new ones arrive.
  const windowStart = new Date(Date.now() - PROFILE_COOKIE_MAX_AGE * 1000);
  await getDb().delete(idempotencyKeys).where(lt(idempotencyKeys.createdAt, windowStart));
  await getDb()
    .insert(idempotencyKeys)
    .values({ key, requestHash: hash, status: 201, body: user, userId: user.id })
    .onConflictDoNothing();
}

export async function updateUser(id: string, changes: AdminUpdateInput): Promise<User> {
  try {
    const [row] = await getDb()
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'No user with this id');
    return toUser(row);
  } catch (error) {
    if (sqlstate(error) === '23505') throw emailTaken();
    throw error;
  }
}

interface Cursor {
  createdAt: string;
  id: string;
}

const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres timestamptz text with up to microseconds, e.g. "2026-10-24 08:40:12.345678+00".
const PG_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?\+00$/;

function decodeCursor(value: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(value, 'base64url').toString()) as Partial<Cursor>;
    if (
      typeof c.createdAt === 'string' &&
      PG_TIMESTAMP.test(c.createdAt) &&
      typeof c.id === 'string' &&
      UUID.test(c.id)
    ) {
      return { createdAt: c.createdAt, id: c.id };
    }
  } catch {
    // fall through to the 400 below
  }
  throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid cursor', { cursor: 'Invalid cursor' });
}

/** Newest first, keyset pagination on (created_at, id) so pages stay stable while users sign up. */
export async function listUsers(limit: number, cursor?: string): Promise<{ users: User[]; nextCursor: string | null }> {
  const after = cursor ? decodeCursor(cursor) : undefined;
  const rows = await getDb()
    .select({
      user: users,
      // Full microsecond precision for the cursor: toISOString() would truncate to milliseconds and skip rows.
      cursorAt: sql<string>`to_char(${users.createdAt} at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') || '+00'`,
    })
    .from(users)
    .where(
      after ? sql`(${users.createdAt}, ${users.id}) < (${after.createdAt}::timestamptz, ${after.id}::uuid)` : undefined,
    )
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    users: page.map((row) => toUser(row.user)),
    nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.cursorAt, id: last.user.id }) : null,
  };
}
