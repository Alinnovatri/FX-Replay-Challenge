import 'server-only';
import type { Variant } from '@/contracts/events';
import { requiredEnv } from './http';

// Every event, client or server, reaches PostHog through here (ADR-003). Properties are opaque ids, enums and
// counts only: no email, name or free text (CLAUDE.md rule 7).

/** Who the event is about: the first-party anonymous id joins client events and the server-side conversion. */
export interface EventContext {
  distinctId: string;
  variant: Variant | null;
  isTest: boolean;
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

let sink: Sink = posthogSink;

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
        setting: (error as { setting?: string }).setting,
      }),
    );
  }
}

/** Server-confirmed events. `user_signed_up` is the primary conversion (docs/ANALYTICS.md). */
export function track(event: ServerEvent, context: EventContext): Promise<void> {
  const base = { variant: context.variant, is_test: context.isTest, source: 'server' } as const;
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
