import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    experienceLevel: text('experience_level'),
    markets: text('markets').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Uniqueness lives in the database so concurrent signups can't both succeed (SQLSTATE 23505 -> 409).
    uniqueIndex('users_email_unique').on(table.email),
    check('users_experience_level_check', sql`${table.experienceLevel} in ('beginner', 'intermediate', 'advanced')`),
  ],
);

/** Stored responses for POST /users retries that carry an Idempotency-Key header. */
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: uuid('key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  status: integer('status').notNull(),
  body: jsonb('body').notNull(),
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
