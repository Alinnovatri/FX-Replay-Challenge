import 'server-only';
import { createHash } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import type { AdminUpdateInput, User } from '@/contracts/users';
import { getDb } from '@/db/client';
import { idempotencyKeys, users } from '@/db/schema';
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

export async function findIdempotent(key: string) {
  const [row] = await getDb().select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key)).limit(1);
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

function decodeCursor(value: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(value, 'base64url').toString()) as Partial<Cursor>;
    if (typeof c.createdAt === 'string' && typeof c.id === 'string' && !Number.isNaN(Date.parse(c.createdAt))) {
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
    .select()
    .from(users)
    .where(
      after ? sql`(${users.createdAt}, ${users.id}) < (${after.createdAt}::timestamptz, ${after.id}::uuid)` : undefined,
    )
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map(toUser);
  const last = page.at(-1);
  return {
    users: page,
    nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
