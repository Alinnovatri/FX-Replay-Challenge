# Analytics plan

What we measure, how it is captured, and how the data stays trustworthy. This file holds the **single
definition of the primary metric**; every other document links here instead of restating it.

## Primary metric

<a id="primary-metric"></a>

**Signup conversion rate** = the conversion from step 1 (`landing_viewed`) to step 4 (`user_signed_up`) of
the [funnel](#funnel) below, counted on unique visitors (`distinct_id`), ordered, within a 1-day window, on
events with `is_test = false`, and counting only conversions with `has_visitor_id = true`.

- The numerator counts only accounts the server created: `user_signed_up` is captured in `POST /users` after
  the insert returns, never on a click and never on a failed or replayed request.
- Both events share the first-party visitor id (`__Host-fxr_aid`), so the ratio is per visitor. A signup from a
  visitor without that cookie (cookies blocked) is still sent, with the user id as `distinct_id` and
  `has_visitor_id = false`; it is excluded from the ratio because that visitor has no `landing_viewed`.
- Per variant, the same ratio is computed within each `variant` value (`control`, `quiz`).

## Architecture

```mermaid
flowchart LR
  B[Browser] -- "landing_viewed, cta_clicked,\nsignup_started, signup_submitted,\nsignup_failed, quiz_step_completed" --> R["POST /api/e\n(relay, Zod contract)"]
  B -- "POST /users" --> U["Users API"]
  U -- "user_signed_up,\nprofile_completed\n(after the insert)" --> C["capture()"]
  R --> C
  C -- "HTTPS, project key" --> P[(PostHog US)]
  X["proxy.ts"] -. "__Host- cookies:\naid, variant, test" .-> B
```

- **Tooling:** PostHog (project "FXReplayChallenge", US region), reached only from the server. No PostHog
  script runs in the page: zero third-party JavaScript, nothing for ad blockers to drop, one place to enforce
  the contract (ADR-003).
- **Relay:** `POST /api/e` (`src/app/api/e/route.ts`) validates every browser event against
  `src/contracts/events.ts`, a closed set of names and enum properties. Anything else is a 400.
- **Server events:** `src/server/analytics.ts` sends `user_signed_up` and `profile_completed` from the
  Users API.
- **Identity and assignment:** `src/proxy.ts` sets HttpOnly first-party cookies: `__Host-fxr_aid` (random UUID
  visitor id), `__Host-fxr_variant` (experiment arm) and `__Host-fxr_test` (test traffic). No third-party cookies; no email or name is
  ever the `distinct_id`. The user id is a property on server events, and the `distinct_id` only when the
  visitor has no visitor id (see the metric definition).
- **Browser tracker:** `src/lib/track.ts`, a typed `fetch(..., { keepalive: true })` under 1 KB.

## Events

Properties added to **every** event by the server: `variant` (`control` or `quiz`, null if unassigned),
`is_test` (boolean), `source` (`relay` or `server`). Server events also carry `has_visitor_id`. Relay events
also get `path` (same-origin path only) and `utm_source`, `utm_medium`, `utm_campaign` (short tokens matching
`^[\w.\-+]+$`, at most 64 characters; anything else is dropped).

| Event | Trigger | Captured | Properties |
| --- | --- | --- | --- |
| `landing_viewed` | Landing renders (`PageView`) | Relay | `referrer_domain`: hostname of `document.referrer`, null when absent or internal |
| `cta_clicked` | A "Try FX Replay Free" link in the header or the final section | Relay | `cta_id`: `header` or `final` |
| `signup_started` | First focus on the name or email field (control) or first answer in the quiz (variant) | Relay | none |
| `signup_submitted` | A valid form is submitted (client validation passed) | Relay | none |
| `signup_failed` | The API answers with an error, or the request times out or fails | Relay | `error_code`: `VALIDATION_FAILED`, `EMAIL_TAKEN`, `IDEMPOTENCY_CONFLICT`, `INTERNAL`, `TIMEOUT`, `NETWORK` |
| `quiz_step_completed` | A quiz step is completed for the first time (variant only; going Back and resubmitting is not counted again) | Relay | `step`: 1 or 2 |
| `user_signed_up` | `POST /users` created the account | Server | `user_id` (opaque UUID) |
| `profile_completed` | A self-service `PATCH /users/:id` succeeded | Server | `user_id`, `fields_count` |

## Funnel

1. `landing_viewed` (entry)
2. `signup_started`
3. `signup_submitted` (for the variant, `quiz_step_completed` steps 1 and 2 sit between 2 and 3)
4. **`user_signed_up` (conversion)**
5. `profile_completed` (activation guardrail, optional step)

In PostHog: an ordered funnel on those events, filtered to `is_test = false`, broken down by `variant`, with a
conversion window of 1 day.

## Data quality

- **One definition:** the primary metric is defined only here; EXPERIMENT and PLAN link to it.
- **Server-confirmed conversion:** the conversion can't fire on a click, a validation error, a 409
  (`EMAIL_TAKEN` or `IDEMPOTENCY_CONFLICT`), a 500 or an idempotent replay (unit tests in
  `tests/unit/users.test.ts`). A client timeout never reaches the server event path.
- **Closed contract:** event names and property values are enums validated on the server; a typo in code fails
  type checking, and a bad payload is a 400 that is visible in tests and logs, not a silent drop.
- **No PII:** no email, name or free text in any property, distinct id or URL. The referrer is sent as a
  hostname validated by the contract (a full URL is a 400) and UTM values as short tokens, so a query string
  with an email can't leak (unit tests). The user id is an opaque UUID.
- **Test traffic tagged, not dropped:** `is_test = true` when the request has `x-fxr-test: 1` or the
  `__Host-fxr_test` cookie (set from that header, or from `?fxr_test=1` outside production only, so a shared
  link can't hide real conversions). An `@example.test` email also tags the `user_signed_up` event (only that
  event, since the email is known only there). Playwright and Lighthouse CI send the header on
  every request, the smoke and API scripts send it too, and every scripted user uses `example.test`. The funnel
  filters `is_test = false`. The test users written to production are listed in `docs/ai-log.md`.
- **Failures are loud:** a PostHog error or a missing `POSTHOG_PROJECT_KEY` is logged as `analytics_failed`
  (event name and error class only) and never breaks the signup.
- **Relay hardening:** same-origin only (a foreign `Origin` is a 403), closed schema, 10 KB body cap. E2E and
  Lighthouse run with `ANALYTICS_SINK=log`, so their events never reach PostHog. Rate limiting is Stage 7.
- **Known limits:** visitors who block cookies get no `__Host-fxr_aid` and their relay events are rejected (the
  conversion is still counted, with the user id as distinct id); clearing cookies starts a new visitor. Bots are
  not filtered beyond PostHog's defaults. A visitor who opens `/variants/quiz` or `/variants/control` directly is moved to
  that arm (QA links); such links are not published, and `?fxr_variant=` only works outside production.
