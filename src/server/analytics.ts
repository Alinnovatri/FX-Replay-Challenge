import 'server-only';
import type { Variant } from '@/contracts/events';
import { ConfigError, requiredEnv } from './http';

// Every event, client or server, reaches PostHog through here (ADR-003). Properties are opaque ids, enums and
// counts only: no email, name or free text (CLAUDE.md rule 7).

/** Who the event is about: the first-party anonymous id joins client events and the server-side conversion. */
export interface EventContext {
  distinctId: string;
  variant: Variant | null;
  isTest: boolean;
  /** False when the visitor had no anonymous id and the user id stands in as distinct id. */
  hasVisitorId: boolean;
}

export type ServerEvent =
  { name: 'user_signed_up'; userId: string } | { name: 'profile_completed'; userId: string; fieldsCount: number };

export interface CapturedEvent {
  event: string;
  distinctId: string;
  properties: Record<string, string | number | boolean | null>;
}

export type Sink = (event: CapturedEvent) => Promise<void>;

// PostHog US region, where the FXReplayChallenge project lives. The project key is public by design (it can only
// write events) but is kept out of the repo and set in Vercel as POSTHOG_PROJECT_KEY.
const POSTHOG_HOST = 'https://us.i.posthog.com';

const posthogSink: Sink = async ({ event, distinctId, properties }) => {
  const res = await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: requiredEnv('POSTHOG_PROJECT_KEY'), event, distinct_id: distinctId, properties }),
    signal: AbortSignal.timeout(2_000),
  });
  if (!res.ok) throw new Error(`posthog responded ${res.status}`);
};

// ANALYTICS_SINK=log keeps events on the machine (E2E). Anything else uses PostHog, which requires the key.
const logSink: Sink = async ({ event }) => {
  console.log(JSON.stringify({ event: 'analytics', name: event }));
};

let sink: Sink = process.env.ANALYTICS_SINK === 'log' ? logSink : posthogSink;

export function setSinkForTests(next: Sink): void {
  sink = next;
}

/** Sends one event. Failures are logged loudly and never break the request that produced the event. */
export async function capture(event: CapturedEvent): Promise<void> {
  try {
    await sink(event);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'analytics_failed',
        name: event.event,
        errorClass: error instanceof Error ? error.name : 'unknown',
        setting: error instanceof ConfigError ? error.setting : undefined,
      }),
    );
  }
}

/** Server-confirmed events. `user_signed_up` is the primary conversion (docs/ANALYTICS.md). */
export function track(event: ServerEvent, context: EventContext): Promise<void> {
  const base = {
    variant: context.variant,
    is_test: context.isTest,
    has_visitor_id: context.hasVisitorId,
    source: 'server',
  } as const;
  if (event.name === 'user_signed_up') {
    return capture({
      event: event.name,
      distinctId: context.distinctId,
      properties: { ...base, user_id: event.userId },
    });
  }
  return capture({
    event: event.name,
    distinctId: context.distinctId,
    properties: { ...base, user_id: event.userId, fields_count: event.fieldsCount },
  });
}
