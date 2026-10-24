# Decisions

Short ADRs. When a decision changes, its ADR is amended in the same PR, with the date and the reason.

## ADR-001: Stack

**Status:** accepted (2026-10-24). **Context:** small landing, signup and Users API, deployed, ~6 h.

- Next.js (App Router) with strict TypeScript. The landing is static; the API lives in Route Handlers in
  the same repo, so one deploy covers both.
- Zod schemas shared by client and server; `zod/mini` for anything shipped to the browser, to keep the
  script budget (200 KB) safe.
- Drizzle ORM on Postgres everywhere: PGlite locally and in tests, Neon in production. One SQL dialect
  means tests exercise the same constraints (unique email, SQLSTATE `23505`) production does.
- Tailwind with tokens imported from `brand/generated/tokens.css`.
- Vitest, Playwright, `@axe-core/playwright`, Lighthouse CI; GitHub Actions; Vercel with per-PR previews.

**Consequences:** PGlite and Neon are both Postgres, but the driver differs (embedded vs serverless HTTP).
The database client is created in one module so tests and production differ only in the driver.

## ADR-002: Node 22.23.4

**Status:** accepted (2026-10-24).
The owner's machine already runs Node 22.23.4 through nvm, with the Vercel CLI 65.2.0 and `neonctl`
installed for it. Node 22 is a maintained LTS line until April 2027, after the submission window, and
Vercel supports `22.x`. Node 24 brings nothing this project needs, and switching would mean reinstalling the
global CLIs. `.nvmrc` pins `22.23.4`; `package.json` will pin `engines.node` to `22.x` and Vercel to `22.x`.
The shell's system Node (23.7.0, an odd, unsupported release) is never used.

**Next step:** move to Node 24 LTS before April 2027.

## ADR-003: Analytics through a first-party relay

**Status:** proposed (detailed in Stage 6).
No PostHog script in the page. The browser sends typed events to a same-origin Route Handler, which
validates them with the shared Zod schema and forwards them with `posthog-node`. The conversion event is
captured on the server inside `POST /users`, after the insert commits, so it can't fire on a click or a
failed request. This keeps third-party JS at zero, avoids ad-blocker loss on the conversion, and gives
one place to strip PII and tag test traffic.

**Trade-off:** we give up PostHog's autocapture, session replay and client-side flag evaluation. Flags for the
experiment are evaluated on the server.

## ADR-004: Users API contract

**Status:** accepted (2026-10-24, Stage 3; signup fields may still be refined with the signup skill in
Stage 4). Implementation notes are at the end of this ADR.

| Endpoint | Auth | Success | Notes |
| --- | --- | --- | --- |
| `POST /users` | None | `201` with the user | Body: `email` (required). Optional `Idempotency-Key` header; a replay with the same key and body returns the original `201`. Sets the self-service cookie |
| `PATCH /users/:id` | Admin token, or the self-service cookie for the same id | `200` with the user | The cookie allows profile fields only, never `email` |
| `GET /users` | Admin token | `200` with a page of users | Cursor pagination, `limit` at most 100 |

Errors share one shape: `{ "error": { "code", "message", "requestId", "fields"? } }`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Body or params fail the shared schema; `fields` lists each problem |
| 401 | `UNAUTHORIZED` | Missing or invalid admin token or cookie |
| 403 | `FORBIDDEN` | Cookie used for another id or for a non-profile field |
| 404 | `NOT_FOUND` | No user with that id |
| 409 | `EMAIL_TAKEN` | The email already exists (unique index, SQLSTATE `23505`) |
| 409 | `IDEMPOTENCY_CONFLICT` | The same key was reused with a different body |
| 500 | `INTERNAL` | Anything unexpected; logs record the error class and SQLSTATE only |

The brief names 400/404/409/500; 401 and 403 are added because protected endpoints need them.
`GET /api/health` is an operational endpoint, not part of the Users API, and is exempt from this shape: it
returns `{ status, db }` with 200, or 503 when the database is unreachable (added 2026-10-24, Stage 2).

**Implementation (Stage 3):**

- Contract in `src/contracts/users.ts` (`zod/mini`, shared with the signup form). Strict objects: unknown fields
  are a 400 with `fields.<name> = "Unknown field"`. Email is trimmed and lower-cased before validation and
  before the unique index, so case variants are duplicates.
- Profile fields: `firstName` (1 to 50 characters), `experienceLevel` (`beginner`, `intermediate`,
  `advanced`, also a database CHECK) and `markets` (subset of the markets in ASSUMPTIONS A-003).
- Self-service cookie `__Host-fxr_profile`: HMAC-SHA256 over `{uid, exp}` with `SESSION_SECRET`; HttpOnly,
  Secure, SameSite=Strict, `Path=/` (required by the `__Host-` prefix), `Max-Age=1800`. Missing, tampered or
  expired: 401. Another id, or `email` in the body: 403.
- Admin token: `Authorization: Bearer <ADMIN_TOKEN>`, compared in constant time over SHA-256 digests. A missing
  `ADMIN_TOKEN` or `SESSION_SECRET` is a 500 whose log names the setting; there is no default.
- Idempotency: `Idempotency-Key` (UUID) on `POST /users` stores the 201 in `idempotency_keys`. A retry with the
  same key and body within 30 minutes (the cookie lifetime) replays it, with `Idempotent-Replayed: true`, the
  same `Location` and no second `user_signed_up`. After 30 minutes the key is ignored, so it can't keep minting
  profile cookies; expired keys are pruned. Neon's HTTP driver has no interactive transactions, so the user
  insert and the key insert are two statements, with two accepted gaps: if storing the key fails, the request
  still returns 201 and logs `idempotency_store_failed` (a later retry gets 409 `EMAIL_TAKEN`); and when two
  retries with the same key race, the loser replays the winner's response only if the winner has already
  stored it, otherwise it gets 409 `EMAIL_TAKEN`. PGlite serialises queries, so the race is not reproduced in
  tests. Reserving the key before the insert is the next step.
- Bodies are read with a 10,000-byte cap (declared `Content-Length` or streamed); larger bodies are a 400.
- A cookie holder sending `email` gets 403 whatever its value; the check runs before validation.
- A malformed id in `PATCH /users/:id` is a 404, the same as an unknown id.
- `user_signed_up` is tracked after the insert returns; `profile_completed` after a self-service PATCH.
  Analytics failures are logged and never fail the request.
- `GET /users`: keyset pagination on `(created_at, id)`, newest first, `limit` 1 to 100 (default 20),
  opaque `nextCursor`.

**Risk:** a 409 on duplicate email tells a caller that an address is registered (account enumeration).
The brief requires the 409; rate limiting in Stage 7 limits probing, and the risk is documented in SECURITY.

## ADR-005: Brand tokens and contrast-driven deviations

**Status:** accepted (2026-10-24).
Tokens are generated from `brand/brand-kit.html` by `scripts/brand/generate-tokens.mjs` (never
transcribed); `--check` fails when the committed output is stale. `scripts/brand/contrast.mjs` measures
every relevant pair into [CONTRAST.md](brand/CONTRAST.md). Where a kit token fails WCAG AA, the UI uses an
existing primitive instead, never a new color:

| Kit token | Problem (measured) | UI uses |
| --- | --- | --- |
| `text-brand` (`blue-600`) for body text and links | 4.02:1 on `bg-primary` | `blue-400` (7.00:1); `blue-600` only for fills, large text and borders |
| `border-primary` to `border-tertiary` for input boundaries | 1.19 to 1.81:1 | `btn-border-outline` (`dark-200`, 3.81:1) for form controls |
| `border-error` | 2.46:1 | Error state shown by text and icon as well as the border; the border uses `text-error` (`#F8D7DA`, 15.44:1 on `bg-primary`) |
| Focus outline (no kit token) | n/a | `blue-400` (7.00:1 on `bg-primary`), the same primitive as links |
| `banner-color-paragraph` on warning and success banners | 2.67 and 2.36:1 | Dark text on those banners, or the light variants, chosen when a banner is built |

The brief invites evolving the visual direction; these changes are that evolution, and each is visible in
the contrast report.

## ADR-006: Branch protection on main

**Status:** accepted (2026-10-24).
`main` requires a pull request, blocks force pushes and deletion, and applies to admins. No approving review
is required: there is one maintainer, and a required review would block every merge. Required status checks
are added in Stage 2, once CI exists. Amended 2026-10-24 (Stage 2): `main` now requires "Lint, typecheck,
unit tests, config", "Build, E2E with axe, Lighthouse", "CodeQL", "Secrets scan (full history)" and
"pnpm audit (production deps)", not strict (a branch need not be up to date with `main`). This matches the one-PR-per-stage flow and doesn't slow it down.

## ADR-007: MCP servers in use

**Status:** accepted (2026-10-24, Stage 1). Tool names are verified with `/mcp` after the restart.

| Server | Where it is configured | Use | Policy in `.claude/settings.json` |
| --- | --- | --- | --- |
| Playwright (`@playwright/mcp@0.0.83`, isolated, headless) | `.mcp.json` (committed) | `qa-a11y-tester`; computed styles and screenshots of fxreplay.com | Navigation, snapshot, screenshot, evaluate and resize allowed; interaction tools ask |
| Vercel | claude.ai connector (owner's account) | Deployment status, build and runtime logs | Named read tools allowed; env-var changes and reads, promote, rollback and rolling releases denied; everything else asks |
| PostHog | claude.ai connector (owner's account) | Verify that events arrive (Stage 6) | Its single `exec` tool reads and writes, so it can't be split by name: it always asks |

The Supabase connector is disabled (owner, 2026-10-24). Deny rules in settings match command prefixes, so
they are a best-effort layer: they cover `gh pr merge`, the common `git push` forms that target `main`,
`drizzle-kit push` (direct, `npx` and `pnpm exec`) and production deploys from the Vercel CLI. The real
controls are branch protection on `main` (a PR is required, also for admins) and the absence of production
credentials in the session: migrations reach Neon only through migrate-on-deploy, and there is no database MCP.
The `env-guard` hook and the Read deny rules are a best-effort guard for secret files. The hook matches text:
it decodes URLs, strips quotes, ANSI-C quote markers and backslashes, expands braces, and blocks path segments
starting with `.env` (except `.env.example`) and globs that match a known secret name. It fails closed: any
error inside the check blocks the call. Accepted false positives: shell text that mentions `.env`, and regex
text such as `sed 's/.*//'`, since `.*` is also a glob that expands to dotfiles. It cannot see a recursive read (`grep -r KEY .`), a shell variable or a
command substitution. The real controls for secrets are that `.env*` is gitignored and that the session never
holds production secrets; the hook stops direct and accidental reads.

**Risk:** the PostHog connector authenticates as a project admin. Every call needs the owner's approval; a
scoped personal API key is the production next step. The connectors are not in the repo, so a reviewer who
clones it gets Playwright only; AI_WORKFLOW documents how to connect the other two.

## ADR-008: Vendored public skills

**Status:** accepted (2026-10-24, Stage 1).
Vendored into `.claude/skills/` from `coreyhaines31/marketingskills` at commit
`e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b` (MIT): `product-marketing`, `copywriting`, `signup`, `cro`. Each
folder keeps the upstream `LICENSE` and a `SOURCE.md` with the commit; `SKILL.md` and `references/` are
unmodified, `evals/` is not vendored. Each SKILL.md was read before committing: none runs a tool or calls an
API. The validator fails if a vendored skill gains an executable or a paid-API key reference.

The skills produce drafts; `brand-copy-reviewer`, `qa-a11y-tester` and `perf-seo-auditor` review the output.
Where a skill conflicts with an owner decision, `CLAUDE.md` wins (for example, `signup` treats a password as
essential; owner decision 9 removes it). The skills read context from `.agents/product-marketing.md`, a
symlink to `docs/PRODUCT_CONTEXT.md`, so there is one context document.

**Deferred (budget re-plan):** `ab-testing` (same repo), Anthropic `frontend-design` and Vercel
`web-design-guidelines`. Stage 5 uses the CLAUDE.md rules and the agents instead; vendoring them is a next step.

## ADR-009: Scaffold, versions and migrate-on-deploy

**Status:** accepted (2026-10-24, Stage 2).

- **Versions:** exact pins published at least two weeks earlier, with one exception: security fixes win.
  `pnpm audit --prod` reported two critical remote-code-execution advisories and one high advisory in
  `next@16.4.0`, and one high advisory in `zod@4.6.5`, so the project uses `next@16.4.2` (9 days old) and
  `zod@4.6.7`. TypeScript stays on 5.9.3: 7.0 is the new native compiler and Next 16 support for it was not
  verified. pnpm is pinned with its sha512 in `packageManager`, and GitHub Actions are pinned to commit SHAs.
- **Database driver:** explicit everywhere. On Vercel it is always Neon; elsewhere `DB_DRIVER` must be
  `pglite` or `neon`, or the app and scripts fail.
- **Migrate-on-deploy:** `scripts/vercel-build.mjs` runs `scripts/migrate.mjs` only when
  `VERCEL_ENV=production`, and `migrate.mjs` itself refuses Neon outside a Vercel production build. Preview
  builds never migrate. Migration errors are logged as error class and SQLSTATE only. The gate is a pure
  function (`planBuild`) covered by `scripts/vercel-build.test.mjs`.
- **Preview databases:** preview deployments read `DATABASE_URL` from the Neon integration but never migrate.
  If the integration gives each preview its own Neon branch, that branch has the schema of the production
  database it was branched from, so a PR that adds a migration gets a preview without the new schema. If it
  doesn't, previews share the production database and must never migrate it. Either way, API changes are
  verified by integration tests on PGlite, in CI, and on production after merge, not on previews.
  Migrating per-preview branches is a next step.
- **Fonts:** self-hosted with `next/font/local` from pinned `@fontsource` packages, because the first
  production build failed while `next/font/google` fetched Nunito Sans. Lato, used by the `h1` (the LCP
  element), uses `display: 'optional'`: with `swap`, a late font load re-painted the heading and produced a
  bimodal LCP (about 1415 ms or 2665 ms) that failed the 2,500 ms gate in the clean-clone test. With
  `optional`, 9 of 9 runs measured about 1414 ms. Trade-off: on a slow first visit the heading may stay in the
  fallback font. Nunito Sans (body) keeps `swap`.
- **Lighthouse:** default mobile form factor (stricter than desktop), devtools throttling, median of 3 runs;
  servers are started with `node node_modules/next/dist/bin/next` so they don't depend on a bare `pnpm`.
- **Accepted dev-only risk:** a full `pnpm audit` reports high advisories in development tooling (`tmp`,
  `extract-zip`, `basic-ftp` through Lighthouse CI's browser tooling, `markdown-it` through markdownlint,
  `esbuild` dev server through drizzle-kit). None ships to production or runs a server reachable from outside;
  CI gates production dependencies only. Dependabot proposes updates with a 7-day cooldown.

## ADR-010: Signup flow

**Status:** accepted (2026-10-24, Stage 4).

- One field, the email, then an optional profile step, matching FX Replay's own email-only signup and owner
  decision 9 (no password). The `signup` skill audit drove the details: a visible label (no placeholder-only
  label), `type=email`, `autocomplete=email` and `inputmode=email`, "Free plan. No credit card required."
  next to the button (A-003), the form keeps its value on error, and "Skip for now" on the profile step.
  Deferred: email typo suggestions and Google sign-in.
- Validation uses the shared `createUserSchema` on blur and on submit; server field errors are shown on the field.
- Double-submit guard: a `useRef` flag ignores submits while a request is in flight. The button uses
  `aria-disabled` and `aria-busy` rather than `disabled`, so it keeps focus and is announced as busy.
- Timeout: 10 s through `setTimeout` and `AbortController` (testable with Playwright's clock). Each signup
  attempt has one `Idempotency-Key`, reused by "Try again" and replaced only when the email changes, so a
  retry after a timeout can't create a second account.
- Focus: to the field on field errors, to the form error on server or network errors, and to the success
  heading on success. Messages use a `role="alert"` field error and an `aria-live` form error, with an icon and
  text, never color alone.
- The conversion stays server-side (`user_signed_up` in `POST /users`); the browser sends no analytics yet
  (Stage 6).
- E2E runs against the production build with a freshly migrated PGlite folder and fake test secrets.
  `localhost` is a secure context, so the `__Host-` cookie works over http in tests.
