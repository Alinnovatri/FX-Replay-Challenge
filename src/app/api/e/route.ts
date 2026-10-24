import { clientEventSchema, utmSchema } from '@/contracts/events';
import { capture } from '@/server/analytics';
import { ANON_COOKIE, isTestTraffic, readVariant } from '@/server/context';
import { readCookie } from '@/server/auth';
import { HttpError, handle, parseOr400, readJson } from '@/server/http';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hostname only: full referrer URLs can carry query strings with personal data. */
function referrerDomain(request: Request): string | null {
  try {
    const referrer = request.headers.get('referer');
    return referrer ? new URL(referrer).hostname : null;
  } catch {
    return null;
  }
}

function utm(url: URL | null, key: string): string | null {
  const value = url?.searchParams.get(key) ?? undefined;
  const parsed = utmSchema.safeParse(value);
  return parsed.success ? (parsed.data ?? null) : null;
}

/**
 * First-party relay for browser events (ADR-003). Validates against the closed event contract, adds the
 * variant, test flag and attribution on the server, and forwards to PostHog. Returns 204 on success.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const event = parseOr400(clientEventSchema.safeParse(await readJson(request)));
    const aid = readCookie(request, ANON_COOKIE);
    // Without the proxy's anonymous id the event can't join the funnel; reject instead of inventing one.
    if (!aid || !UUID.test(aid)) throw new HttpError(400, 'VALIDATION_FAILED', 'Missing visitor id');

    let landing: URL | null = null;
    try {
      const referrer = request.headers.get('referer');
      landing = referrer ? new URL(referrer) : null;
    } catch {
      landing = null;
    }
    await capture({
      event: event.name,
      distinctId: aid,
      properties: {
        ...event.props,
        variant: readVariant(request),
        is_test: isTestTraffic(request),
        source: 'relay',
        path: landing && landing.origin === new URL(request.url).origin ? landing.pathname : null,
        referrer_domain: referrerDomain(request),
        utm_source: utm(landing, 'utm_source'),
        utm_medium: utm(landing, 'utm_medium'),
        utm_campaign: utm(landing, 'utm_campaign'),
      },
    });
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  });
}
