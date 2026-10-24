# Demo script and new-requirement playbook

A 10 to 15 minute walkthrough for the technical review, followed by how the design absorbs a new requirement.
Every number quoted here is in [PERFORMANCE.md](PERFORMANCE.md), [ANALYTICS.md](ANALYTICS.md) or
[ai-log.md](ai-log.md); re-check it before quoting.

## Before the call

- Open <https://fx-replay-challenge.vercel.app>, `/variants/quiz` and `/variants/control` in a browser that sends
  `x-fxr-test: 1` (a header extension), so demo traffic is tagged `is_test` and stays out of the funnel.
- Open the repo, the latest green CI run, PostHog filtered to `is_test = true`, and the Vercel deployment.
- Use only `smoke+demo-<n>@example.test` emails.

## Walkthrough (about 12 minutes)

| Minute | Show | Say |
| --- | --- | --- |
| 0–1 | The brief's goal and the metric link in [ANALYTICS.md](ANALYTICS.md#primary-metric) | Success is a server-confirmed account, never a click; everything else serves that number |
| 1–3 | `/` at 360 px and 1440 px: hero, signup card, trust strip, screenshots, FAQ | Value proposition and form above the fold; every claim maps to a sourced row in ASSUMPTIONS A-003; no performance promise |
| 3–5 | A signup: blur validation, a taken email, then success | States, focus management, Idempotency-Key reused on retry, the A-004 note about what this account is |
| 5–6 | `/variants/quiz`: the three steps, Back, progress bar | The A/B test: quiz-first versus email-first, assigned 50/50 on the server with no flash |
| 6–8 | [EXPERIMENT.md](EXPERIMENT.md) and PostHog | Hypothesis, guardrails, 8,155 visitors per arm, decision rules; test traffic tagged and excluded |
| 8–9 | `src/contracts/users.ts`, `POST /users` errors in the README | One Zod contract for client and server, one error shape, 409 for duplicates, keyset pagination |
| 9–11 | `.claude/` (agents, skills, hooks) and [AI_WORKFLOW.md](AI_WORKFLOW.md) | Six reviewers with fixed output; examples where they caught real bugs; what was rejected |
| 11–12 | CI and Lighthouse budgets, [PERFORMANCE.md](PERFORMANCE.md) | Budgets enforced in CI; LCP is the `h1`; zero third-party bytes; the known LCP outliers |
| 12+ | [README, "Not prioritized"](../README.md#not-prioritized) | What was left out on purpose, why, and the next step for each |

## New-requirement playbook

The same loop every time: restate it, find the layer it touches, show a short plan, change the contract first,
then code, tests, docs, and the relevant agent.

| If they ask for | Where it lands | Steps and checks |
| --- | --- | --- |
| A new signup field (for example "trading goal") | `src/contracts/users.ts`, a migration, `SignupForm` or `QuizSignup` | `add-migration` skill; update the shared schema (the client gets validation for free); unit test for the API, e2e for the form; ADR-004 row; `code-reviewer` |
| A new event or property | `src/contracts/events.ts`, the tracker call, ANALYTICS.md | `add-tracked-event` skill keeps the taxonomy, schema, code and docs in sync; `analytics-auditor` for PII and tagging |
| A different experiment or a third arm | `src/proxy.ts` (assignment), `/variants/*`, EXPERIMENT.md | Recompute the sample size; keep the metric link; a fixed QA URL per arm; unit test for assignment |
| Another language | `src/content/landing.ts` becomes per-locale; metadata and `hreflang` | Copy only from sourced facts; `brand-copy-reviewer`; Lighthouse for SEO |
| Rate limiting or bot protection | `POST /users` and `/api/e` | A shared store (for example Upstash Redis) rather than memory, which does not hold across serverless instances; needs the owner's cost approval; 429 with the uniform error shape |
| Email verification or real FX Replay accounts | The success state and the users table | Replace A-004's note with a hand-off; the conversion event stays server-side |
| A performance regression | `lighthouserc.cjs` budgets | Reproduce with `pnpm lhci`, compare the LCP element and bytes, fix, re-run |
