import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/e/route';
import { setSinkForTests, type CapturedEvent } from '@/server/analytics';
import { assignVariant, proxy } from '@/proxy';

const AID = '22222222-2222-4222-8222-222222222222';
const captured: CapturedEvent[] = [];

const relay = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('https://app.test/api/e', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `__Host-fxr_aid=${AID}; __Host-fxr_variant=control`,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  captured.length = 0;
  setSinkForTests(async (event) => {
    captured.push(event);
  });
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/e relay', () => {
  it('forwards a valid event with variant, test flag, path and UTM tokens', async () => {
    const res = await relay(
      { name: 'cta_clicked', props: { cta_id: 'header' } },
      {
        referer: 'https://app.test/?utm_source=google&utm_medium=cpc&utm_campaign=free-plan&email=a@b.c',
        origin: 'https://app.test',
      },
    );
    expect(res.status).toBe(204);
    expect(captured[0]).toMatchObject({
      event: 'cta_clicked',
      distinctId: AID,
      properties: {
        cta_id: 'header',
        variant: 'control',
        is_test: false,
        source: 'relay',
        path: '/',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'free-plan',
      },
    });
    // Only the whitelisted tokens leave the URL: the email in the query string is never forwarded.
    expect(JSON.stringify(captured[0])).not.toContain('a@b.c');
  });

  it('rejects unknown events, unknown properties and free text', async () => {
    expect((await relay({ name: 'purchase', props: {} })).status).toBe(400);
    expect((await relay({ name: 'landing_viewed', props: { referrer_domain: null, email: 'a@b.c' } })).status).toBe(
      400,
    );
    expect((await relay({ name: 'cta_clicked', props: { cta_id: 'anything' } })).status).toBe(400);
    expect((await relay({ name: 'signup_failed', props: { error_code: 'free text' } })).status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it('rejects a full referrer URL and cross-site events', async () => {
    expect(
      (await relay({ name: 'landing_viewed', props: { referrer_domain: 'https://x.example/?q=a@b.c' } })).status,
    ).toBe(400);
    expect(
      (await relay({ name: 'landing_viewed', props: { referrer_domain: null } }, { origin: 'https://evil.example' }))
        .status,
    ).toBe(403);
    expect(captured).toHaveLength(0);
  });

  it('tags test traffic from the header or the test cookie', async () => {
    await relay({ name: 'landing_viewed', props: { referrer_domain: null } }, { 'x-fxr-test': '1' });
    await relay(
      { name: 'landing_viewed', props: { referrer_domain: null } },
      { cookie: `__Host-fxr_aid=${AID}; __Host-fxr_test=1` },
    );
    expect(captured.map((e) => e.properties.is_test)).toEqual([true, true]);
  });

  it('rejects an event without a visitor id instead of inventing one', async () => {
    const res = await POST(
      new Request('https://app.test/api/e', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'landing_viewed', props: { referrer_domain: null } }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('logs a PostHog failure without failing the request or leaking data', async () => {
    setSinkForTests(async () => {
      throw new Error('posthog down');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await relay({ name: 'landing_viewed', props: { referrer_domain: null } })).status).toBe(204);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      event: 'analytics_failed',
      name: 'landing_viewed',
    });
  });
});

describe('proxy: experiment assignment', () => {
  const visit = (url: string, cookie = '', headers: Record<string, string> = {}) =>
    proxy(new NextRequest(url, { headers: { cookie, ...headers } }));

  it('splits 50/50 on the random draw', () => {
    expect(assignVariant(0.1)).toBe('control');
    expect(assignVariant(0.49)).toBe('control');
    expect(assignVariant(0.5)).toBe('quiz');
    expect(assignVariant(0.9)).toBe('quiz');
  });

  it('assigns a variant and a visitor id on the first visit, and is not cached', () => {
    const res = visit('https://app.test/');
    expect(['control', 'quiz']).toContain(res.cookies.get('__Host-fxr_variant')?.value);
    expect(res.cookies.get('__Host-fxr_aid')?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('keeps an existing assignment and rewrites / to the quiz for quiz visitors', () => {
    const quiz = visit('https://app.test/', `__Host-fxr_variant=quiz; __Host-fxr_aid=${AID}`);
    expect(quiz.headers.get('x-middleware-rewrite')).toBe('https://app.test/variants/quiz');
    expect(quiz.cookies.get('__Host-fxr_variant')).toBeUndefined();
    expect(quiz.cookies.get('__Host-fxr_aid')).toBeUndefined();
    const control = visit('https://app.test/', `__Host-fxr_variant=control; __Host-fxr_aid=${AID}`);
    expect(control.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('ignores query overrides in production, so a shared link cannot flip arms or hide conversions', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const res = visit('https://app.test/?fxr_variant=quiz&fxr_test=1', '__Host-fxr_variant=control');
    expect(res.cookies.get('__Host-fxr_variant')).toBeUndefined();
    expect(res.cookies.get('__Host-fxr_test')).toBeUndefined();
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    const tagged = visit('https://app.test/', '__Host-fxr_variant=control', { 'x-fxr-test': '1' });
    expect(tagged.cookies.get('__Host-fxr_test')?.value).toBe('1');
    vi.unstubAllEnvs();
  });

  it('tags test traffic and honours an explicit override outside production', () => {
    const res = visit('https://app.test/?fxr_variant=quiz&fxr_test=1', '__Host-fxr_variant=control');
    expect(res.cookies.get('__Host-fxr_variant')?.value).toBe('quiz');
    expect(res.cookies.get('__Host-fxr_test')?.value).toBe('1');
  });
});
