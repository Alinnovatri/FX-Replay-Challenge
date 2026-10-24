// Shared Users API contract. Used by the route handlers and, from Stage 4, by the signup form.
// zod/mini keeps the browser bundle small.
import * as z from 'zod/mini';

// Pragmatic address check; the database unique index is the real guard against duplicates.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const email = z
  .string()
  .check(z.trim(), z.toLowerCase(), z.maxLength(254), z.regex(EMAIL, 'Enter a valid email address'));

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
// Markets FX Replay lists on its site (docs/ASSUMPTIONS.md A-003).
export const MARKETS = ['forex', 'futures', 'stocks', 'crypto', 'indices', 'metals'] as const;

const profileFields = {
  firstName: z.optional(z.string().check(z.trim(), z.minLength(1), z.maxLength(50))),
  experienceLevel: z.optional(z.enum(EXPERIENCE_LEVELS)),
  markets: z.optional(z.array(z.enum(MARKETS)).check(z.maxLength(MARKETS.length))),
};

/**
 * Signup. Email is required; the quiz-first variant (ADR-011) also sends the answers it collected before the
 * email, so they are saved with the account in one request.
 */
export const createUserSchema = z.strictObject({
  email,
  experienceLevel: profileFields.experienceLevel,
  markets: profileFields.markets,
});

/** What the self-service cookie may change. Email is deliberately absent. */
export const profileUpdateSchema = z.strictObject(profileFields);
/** What the admin token may change. */
export const adminUpdateSchema = z.strictObject({ ...profileFields, email: z.optional(email) });

export const listUsersQuerySchema = z.object({
  limit: z.optional(z.coerce.number().check(z.int(), z.minimum(1), z.maximum(100))),
  cursor: z.optional(z.string().check(z.maxLength(200))),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number] | null;
  markets: (typeof MARKETS)[number][] | null;
  createdAt: string;
  updatedAt: string;
}

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL';

export interface ApiError {
  error: { code: ErrorCode; message: string; requestId: string; fields?: Record<string, string> };
}
