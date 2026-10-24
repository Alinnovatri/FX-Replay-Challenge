# FX Replay Challenge

A "Try FX Replay Free" landing page, a signup flow and a Users API, built to raise the conversion rate from
marketing traffic to account creation. The conversion metric is defined in
[ANALYTICS.md](docs/ANALYTICS.md#primary-metric).

- Production: <https://fx-replay-challenge.vercel.app> (smoke: `BASE_URL=https://fx-replay-challenge.vercel.app pnpm smoke`).
- Deliverables: [Architecture](docs/ARCHITECTURE.md), [Analytics plan](docs/ANALYTICS.md),
  [Experiment](docs/EXPERIMENT.md), [AI-native workflow](docs/AI_WORKFLOW.md),
  [Performance review](docs/PERFORMANCE.md), [Security](docs/SECURITY.md), [Demo script](docs/DEMO.md).
- Working notes: [brief](docs/brief.md), [plan](docs/PLAN.md), [decisions](docs/DECISIONS.md),
  [assumptions](docs/ASSUMPTIONS.md), [AI log](docs/ai-log.md).

## Requirements

- Node 22.23.4 (`.nvmrc`). With nvm: `nvm install && nvm use`.
- pnpm 10.8.1 through Corepack (bundled with Node): `corepack enable`, or prefix commands with `corepack`.
- For E2E tests: Chromium for Playwright (`pnpm exec playwright install chromium`).
- For Lighthouse: a local Chrome or Chromium.

No database server, Docker or account is needed locally: development and tests use PGlite, an embedded
Postgres. Production uses Neon Postgres on Vercel.

## Run locally

```bash
git clone https://github.com/Alinnovatri/FX-Replay-Challenge.git fx-replay-challenge
cd fx-replay-challenge
nvm install
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` applies migrations to a local PGlite database in `.pglite/` and starts Next.js on
<http://localhost:3000>, with local-only placeholder secrets and analytics kept in the log
(`ANALYTICS_SINK=log`); export your own `ADMIN_TOKEN` or `SESSION_SECRET` to override them. Production requires
the real values and fails loudly without them. Health check: <http://localhost:3000/api/health>.

## Checks

Every command sets the same environment CI uses (`DB_DRIVER=pglite`, `PGLITE_DIR=memory://` for tests and
test servers); nothing else is needed.

| Check | Command | Notes |
| --- | --- | --- |
| Lint (ESLint, Prettier, markdownlint) | `pnpm lint` | markdownlint also counts table columns |
| Types | `pnpm typecheck` | Strict TypeScript |
| Unit and integration tests | `pnpm test` | Vitest on an in-memory PGlite with all migrations |
| Claude Code config, brand tokens, contrast | `pnpm check:config` | Fails if generated files are stale |
| Production build | `pnpm build` | Needed before E2E and Lighthouse |
| E2E with axe (desktop and mobile) | `pnpm e2e` | Starts the built app on port 3200 |
| Lighthouse CI (median of 3, mobile, devtools throttling) | `pnpm lhci` | Starts the built app on port 3300; budgets in `lighthouserc.cjs` |
| Smoke test of a deployment | `BASE_URL=https://<deployment> pnpm smoke` | Read-only; creates no users |
| Users API check of a deployment | `BASE_URL=https://<deployment> node scripts/verify-api.mjs` | Writes one `smoke+<timestamp>@example.test` user; no secrets needed |

## Users API

Contract: [src/contracts/users.ts](src/contracts/users.ts); decisions and error codes: ADR-004 in
[docs/DECISIONS.md](docs/DECISIONS.md#adr-004-users-api-contract).

| Method and path | Auth | Success | Errors |
| --- | --- | --- | --- |
| `POST /users` with `{ "email" }`, optionally `firstName`, `experienceLevel`, `markets` | None; optional `Idempotency-Key` (UUID) | `201 { user }` and the `__Host-fxr_profile` cookie | 400, 409 `EMAIL_TAKEN`, 409 `IDEMPOTENCY_CONFLICT`, 500 |
| `PATCH /users/:id` with profile fields | Self-service cookie (same id, no email) or `Authorization: Bearer <ADMIN_TOKEN>` | `200 { user }` | 400, 401, 403, 404, 409, 500 |
| `GET /users?limit=&cursor=` | `Authorization: Bearer <ADMIN_TOKEN>` | `200 { users, nextCursor }` | 400, 401, 500 |

Errors share one shape: `{ "error": { "code", "message", "requestId", "fields"? } }`.

## Database and migrations

- Schema: `src/db/schema.ts`. Migrations: `drizzle/`, generated with `pnpm db:generate` and never edited after
  they are applied.
- Locally and in tests, migrations run against PGlite (`pnpm db:migrate`, or automatically in `pnpm dev`).
- Production applies migrations only during a Vercel production build (`scripts/vercel-build.mjs`); preview
  builds skip them. Nobody runs migrations against production by hand.

## Deployment

Vercel builds from GitHub: every pull request gets a preview, and `main` deploys to production. The Neon
integration from the Vercel Marketplace provides `DATABASE_URL`; no secret lives in the repo. See
[.env.example](.env.example).

## Project layout

| Path | Contents |
| --- | --- |
| `src/app` | Next.js App Router pages and Route Handlers |
| `src/db` | Drizzle schema and database client |
| `drizzle/` | SQL migrations |
| `tests/`, `e2e/` | Vitest and Playwright tests |
| `brand/` | Delivered brand kit and generated tokens |
| `scripts/` | Token generator, contrast report, config validator, migrate, build and smoke scripts |
| `.claude/`, `CLAUDE.md`, `.mcp.json` | The Claude Code system: agents, skills, hooks, MCP policy |

## Not prioritized

Left out on purpose to keep the solution small; each item has its reason and next step. Accepted risks are in
[SECURITY.md](docs/SECURITY.md#accepted-risks) and [PERFORMANCE.md](docs/PERFORMANCE.md).

| Item | Why it was not done | Next step |
| --- | --- | --- |
| Rate limiting and bot protection on `/users` and `/api/e` | An in-memory limiter does not hold across serverless instances; a shared store is a paid service that needs approval | Upstash Redis (or Vercel Firewall rules) with a 429 in the uniform error shape |
| Accounts in the real FX Replay app | Our users don't exist there (ASSUMPTIONS A-004) | Hand off to FX Replay's signup or identity system; keep `user_signed_up` server-side |
| Email verification and sign-in | Not required by the brief; no password by owner decision | Magic link after signup |
| An experiment result | 8,155 visitors per arm are needed ([EXPERIMENT.md](docs/EXPERIMENT.md)); the design is the deliverable | Run with real traffic; decide with the documented rules |
| Excluding the owner's own browsing | Only requests with `x-fxr-test: 1` are tagged; untagged manual visits count as real traffic | Filter internal IPs in PostHog, or tag with a header extension |
| E2E and Lighthouse against production | Covered locally and in CI on the same build; production has a read-only smoke | A scheduled read-only run against the live URL |
| LCP outliers (about 2.7 s in some lab runs) | Seen in 2 of 9 runs; the cause is inferred, not proven | Field data (Web Vitals to PostHog) before more lab tuning |
| Localisation and consent by region | Languages and regions are not sourced (TODO(owner) in ARCHITECTURE) | Per-locale content files and `hreflang` once confirmed |
| Dependabot updates | The open PRs were closed after their previews failed, most likely on Neon's free branch limit (inferred); `dependabot/**` previews are now off | Triage weekly; React and react-dom together |
| Brand source files and `blue-950` | Not delivered ([QUESTIONS.md](docs/QUESTIONS.md) Q1, Q2) | Replace the generated tokens in one PR when they arrive |
| Test users in production | Kept as evidence of the checks, all `smoke+…@example.test` | The owner can delete them in Neon; nothing reads them |
