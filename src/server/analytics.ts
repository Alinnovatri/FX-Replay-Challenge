import 'server-only';

// Server-side analytics events. Conversion is captured here, after the database commit, never in the browser.
// Properties are opaque ids and counts only: no email, name or free text (CLAUDE.md rule 7).
export type ServerEvent =
  { name: 'user_signed_up'; userId: string } | { name: 'profile_completed'; userId: string; fieldsCount: number };

export type Sink = (event: ServerEvent) => Promise<void>;

// Stage 3 sink: a structured log line. Stage 6 replaces it with the PostHog relay.
let sink: Sink = async (event) => {
  console.log(JSON.stringify({ event: 'analytics', name: event.name }));
};

export function setSinkForTests(next: Sink): void {
  sink = next;
}

/** Never lets an analytics failure break the request that produced the event. */
export async function track(event: ServerEvent): Promise<void> {
  try {
    await sink(event);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'analytics_failed',
        name: event.name,
        errorClass: error instanceof Error ? error.name : 'unknown',
      }),
    );
  }
}
