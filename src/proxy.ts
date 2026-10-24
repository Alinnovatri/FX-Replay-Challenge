import { NextResponse, type NextRequest } from 'next/server';
import { VARIANTS, type Variant } from '@/contracts/events';

// Experiment assignment and visitor id (ADR-011, docs/EXPERIMENT.md). Runs only for the landing page.
// - fxr_aid: a random first-party visitor id that joins client events with the server-side conversion.
// - fxr_variant: control or quiz, assigned 50/50 once and kept for 90 days, so a visitor always sees one variant.
// - fxr_test: set when the request carries x-fxr-test: 1 or ?fxr_test=1, so test traffic is tagged.
// The quiz variant is served at / through a rewrite: the URL doesn't change and nothing flashes on the client.

const MAX_AGE = 60 * 60 * 24 * 90;
const cookie = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE } as const;

export function assignVariant(random: number = crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32): Variant {
  return random < 0.5 ? 'control' : 'quiz';
}

export function proxy(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const onVariantPage = url.pathname === '/variants/quiz';
  const override = onVariantPage ? 'quiz' : url.searchParams.get('fxr_variant');
  const existing = request.cookies.get('fxr_variant')?.value;
  const variant: Variant = VARIANTS.includes(override as Variant)
    ? (override as Variant)
    : VARIANTS.includes(existing as Variant)
      ? (existing as Variant)
      : assignVariant();

  const response =
    variant === 'quiz' && !onVariantPage ? NextResponse.rewrite(new URL('/variants/quiz', url)) : NextResponse.next();
  // Variant pages are cached per URL; the decision must not be shared between visitors.
  response.headers.set('cache-control', 'private, no-store');
  if (existing !== variant) response.cookies.set('fxr_variant', variant, cookie);
  if (!request.cookies.get('fxr_aid')?.value) response.cookies.set('fxr_aid', crypto.randomUUID(), cookie);
  if (request.headers.get('x-fxr-test') === '1' || url.searchParams.get('fxr_test') === '1') {
    response.cookies.set('fxr_test', '1', { ...cookie, maxAge: 60 * 60 * 24 });
  }
  return response;
}

export const config = { matcher: ['/', '/variants/quiz'] };
