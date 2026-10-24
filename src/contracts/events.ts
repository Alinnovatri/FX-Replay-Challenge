// Analytics event contract shared by the browser tracker and the relay (docs/ANALYTICS.md is the taxonomy).
// Closed enums only: no free text, email or name can travel in an event (CLAUDE.md rule 7).
import * as z from 'zod/mini';

export const VARIANTS = ['control', 'quiz'] as const;
export type Variant = (typeof VARIANTS)[number];

export const CTA_IDS = ['header', 'final'] as const;
export const SIGNUP_ERROR_CODES = [
  'VALIDATION_FAILED',
  'EMAIL_TAKEN',
  'IDEMPOTENCY_CONFLICT',
  'INTERNAL',
  'TIMEOUT',
  'NETWORK',
] as const;

const hostname = z.string().check(z.maxLength(253), z.regex(/^[a-z0-9.-]+$/i));

/** Events the browser may send to POST /api/e. Server-only events (user_signed_up, profile_completed) are not here. */
export const clientEventSchema = z.discriminatedUnion('name', [
  z.strictObject({
    name: z.literal('landing_viewed'),
    // Hostname of document.referrer only (never the full URL, which can carry personal data); null if none.
    props: z.strictObject({ referrer_domain: z.nullable(hostname) }),
  }),
  z.strictObject({ name: z.literal('cta_clicked'), props: z.strictObject({ cta_id: z.enum(CTA_IDS) }) }),
  z.strictObject({ name: z.literal('signup_started'), props: z.strictObject({}) }),
  z.strictObject({ name: z.literal('signup_submitted'), props: z.strictObject({}) }),
  z.strictObject({
    name: z.literal('signup_failed'),
    props: z.strictObject({ error_code: z.enum(SIGNUP_ERROR_CODES) }),
  }),
  z.strictObject({
    name: z.literal('quiz_step_completed'),
    props: z.strictObject({ step: z.number().check(z.int(), z.minimum(1), z.maximum(2)) }),
  }),
]);

export type ClientEvent = z.infer<typeof clientEventSchema>;

/** Attribution read from the landing URL; short tokens only, anything else is dropped. */
export const utmSchema = z.optional(z.string().check(z.maxLength(64), z.regex(/^[\w.\-+]+$/)));
