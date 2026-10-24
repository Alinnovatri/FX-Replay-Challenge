import 'server-only';
import { VARIANTS, type Variant } from '@/contracts/events';
import type { EventContext } from './analytics';
import { readCookie } from './auth';

// First-party cookies set by src/proxy.ts. Read on the server only (HttpOnly).
export const ANON_COOKIE = 'fxr_aid';
export const VARIANT_COOKIE = 'fxr_variant';
export const TEST_COOKIE = 'fxr_test';
export const TEST_HEADER = 'x-fxr-test';
// Reserved test domain used by smoke, E2E and verification scripts (RFC 2606).
const TEST_EMAIL_DOMAIN = '@example.test';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readVariant(request: Request): Variant | null {
  const value = readCookie(request, VARIANT_COOKIE);
  return VARIANTS.includes(value as Variant) ? (value as Variant) : null;
}

/** Test traffic is tagged, never dropped: the funnel filters on is_test = false (docs/ANALYTICS.md). */
export function isTestTraffic(request: Request, email?: string): boolean {
  return (
    request.headers.get(TEST_HEADER) === '1' ||
    readCookie(request, TEST_COOKIE) === '1' ||
    Boolean(email?.endsWith(TEST_EMAIL_DOMAIN))
  );
}

/** Context for a server event; falls back to the user id as distinct id when the visitor has no anonymous id. */
export function eventContext(request: Request, fallbackId: string, email?: string): EventContext {
  const aid = readCookie(request, ANON_COOKIE);
  return {
    distinctId: aid && UUID.test(aid) ? aid : fallbackId,
    variant: readVariant(request),
    isTest: isTestTraffic(request, email),
  };
}
