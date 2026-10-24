# FX Replay Challenge

A "Try FX Replay Free" landing page, a signup flow and a Users API, built to raise the conversion rate from
marketing traffic to account creation. Conversion is counted only when the server confirms the account.

- Production: <https://fx-replay-challenge.vercel.app> (smoke: `BASE_URL=https://fx-replay-challenge.vercel.app pnpm smoke`).
- Brief: [docs/brief.md](docs/brief.md). Plan and budgets: [docs/PLAN.md](docs/PLAN.md). Decisions:
  [docs/DECISIONS.md](docs/DECISIONS.md). AI workflow log: [docs/ai-log.md](docs/ai-log.md).

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
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` applies migrations to a local PGlite database in `.pglite/` and starts Next.js on
<http://localhost:3000>. Health check: <http://localhost:3000/api/health>.

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
| `POST /users` with `{ "email" }` | None; optional `Idempotency-Key` (UUID) | `201 { user }` and the `__Host-fxr_profile` cookie | 400, 409 `EMAIL_TAKEN`, 409 `IDEMPOTENCY_CONFLICT`, 500 |
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
