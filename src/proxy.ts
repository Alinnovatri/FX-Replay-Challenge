import { NextResponse, type NextRequest } from 'next/server';
import { VARIANTS, type Variant } from '@/contracts/events';

// Experiment assignment and visitor id (ADR-011, docs/EXPERIMENT.md). Runs for the landing page and the variant.
// Cookies (HttpOnly, Secure, __Host- so no sibling subdomain can plant them):
// - __Host-fxr_aid: a random visitor id that joins client events with the server-side conversion.
// - __Host-fxr_variant: control or quiz, assigned 50/50 once and kept for 90 days.
// - __Host-fxr_test: set when the request carries x-fxr-test: 1 (and, outside production, ?fxr_test=1).
// The quiz variant is served at / through a rewrite: the URL doesn't change and nothing flashes on the client.

const MAX_AGE = 60 * 60 * 24 * 90;
const cookie = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE } as const;
const AID = '__Host-fxr_aid';
const VARIANT = '__Host-fxr_variant';
const TEST = '__Host-fxr_test';

// Query overrides (?fxr_variant=, ?fxr_test=1) work on previews and locally only. In production a shared link
// could otherwise flip a visitor's arm or tag real conversions as test traffic. Scripts use the header.
const overridesAllowed = () => process.env.VERCEL_ENV !== 'production';

export function assignVariant(random: number = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32): Variant {
  return random < 0.5 ? 'control' : 'quiz';
}

const isVariant = (value: string | null | undefined): value is Variant => VARIANTS.includes(value as Variant);

export function proxy(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const onVariantPage = url.pathname === '/variants/quiz';
  const override = onVariantPage ? 'quiz' : overridesAllowed() ? url.searchParams.get('fxr_variant') : null;
  const existing = request.cookies.get(VARIANT)?.value;
  const variant: Variant = isVariant(override) ? override : isVariant(existing) ? existing : assignVariant();

  const response =
    variant === 'quiz' && !onVariantPage ? NextResponse.rewrite(new URL('/variants/quiz', url)) : NextResponse.next();
  // The decision is per visitor: never let a shared cache serve one visitor's arm to another.
  response.headers.set('cache-control', 'private, no-store');
  if (existing !== variant) response.cookies.set(VARIANT, variant, cookie);
  if (!request.cookies.get(AID)?.value) response.cookies.set(AID, crypto.randomUUID(), cookie);
  if (request.headers.get('x-fxr-test') === '1' || (overridesAllowed() && url.searchParams.get('fxr_test') === '1')) {
    response.cookies.set(TEST, '1', { ...cookie, maxAge: 60 * 60 * 24 });
  }
  return response;
}

export const config = { matcher: ['/', '/variants/quiz'] };
