# FX Replay Challenge

A "Try FX Replay Free" landing page, a signup flow and a Users API, built to raise the conversion rate from
marketing traffic to account creation. Success is the signup conversion rate, counted only on a
server-confirmed account creation (`user_signed_up`), never on a click.

Source of truth: [docs/brief.md](docs/brief.md). Order and budgets: [docs/PLAN.md](docs/PLAN.md).
Decisions: [docs/DECISIONS.md](docs/DECISIONS.md). Assumptions: [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

## Stack

Next.js (App Router) with strict TypeScript, Route Handlers for the API, Zod shared by client and server
(`zod/mini` in the browser), Drizzle on Postgres (PGlite locally and in tests, Neon in production), Tailwind
with tokens from `brand/generated/tokens.css`, analytics through a first-party relay to PostHog, Vitest,
Playwright, `@axe-core/playwright`, Lighthouse CI, GitHub Actions, Vercel. Node 22.23.4 (`.nvmrc`).

## Commands

| Task | Command |
| --- | --- |
| Use the pinned Node | `nvm use` |
| Regenerate brand tokens | `node scripts/brand/generate-tokens.mjs` (add `--check` to verify) |
| Regenerate the contrast report | `node scripts/brand/contrast.mjs` (add `--check` to verify) |
| Validate the Claude Code config | `node scripts/validate-claude-config.mjs` |
| Script tests and config checks | `pnpm check:config` |
| Dev server (PGlite in `.pglite/`) | `pnpm dev` |
| Lint, types, unit and integration tests | `pnpm lint`, `pnpm typecheck`, `pnpm test` |
| Production build, E2E with axe, Lighthouse | `pnpm build`, then `pnpm e2e` and `pnpm lhci` |
| Smoke a deployment | `BASE_URL=https://<deployment> pnpm smoke` |
| Generate a migration | `pnpm db:generate` (see the `add-migration` skill) |

Use `corepack pnpm <script>` where `pnpm` is not on the PATH. The scripts set the env CI uses; see README.

## Reviews and audits

Reviews and audits use the project subagents in `.claude/agents/`, never built-in or plugin skills with
similar names (`/code-review`, `/security-review`, `engineering:code-review`, `design:accessibility-review`).
Each agent returns the fixed format defined in its file; paste its verdict into the stage report.

| Agent | Use it for |
| --- | --- |
| `code-reviewer` | Every diff before a PR |
| `security-reviewer` | API, auth, cookies, headers, secrets, dependencies |
| `qa-a11y-tester` | E2E states, axe, keyboard and reduced-motion checks |
| `analytics-auditor` | Events against the taxonomy, PII, test-traffic tagging |
| `perf-seo-auditor` | Lighthouse budgets, metadata, structured data |
| `brand-copy-reviewer` | Copy against verified facts, the no-performance-promise rule and brand tokens |

Project skills: `add-tracked-event`, `add-migration`, `stage-checkpoint`, `pre-submit-audit`. Vendored public
skills (`product-marketing`, `copywriting`, `signup`, `cro`) produce drafts only; the agents above review
their output. They read product context from `.agents/product-marketing.md`, a symlink to
`docs/PRODUCT_CONTEXT.md`. Where a vendored skill conflicts with this file or an owner decision (for
example, `signup` assumes a password), this file wins.

## Rules

1. Work only on the current stage. Show a short plan and wait for the owner's OK; report what was done,
   decisions, manual checks, risks and measured time (`date` at the start and end of the stage).
2. One branch and one PR per stage into `main`; never stack PRs; Conventional Commits, one logical change each.
   Never merge to `main` yourself.
3. No claim without evidence: every "passes", "works" or number comes from output, a log or a URL checked now.
4. Don't invent facts about FX Replay. Use only the facts in `docs/ASSUMPTIONS.md` A-003 or
   `docs/PRODUCT_CONTEXT.md`, each with its source URL; otherwise leave `TODO(owner)` and ask.
5. Trading product: frame FX Replay as practice and backtesting. Never promise profits or performance.
6. Secrets: never read or print `.env*` except `.env.example`; never ask for secrets in chat. The owner's manual
   steps use `read -rs`, a password-manager CLI or the provider's integration. Production database changes go
   through migrate-on-deploy only.
7. No PII (email, name, free text) in analytics properties, logs or URLs. Logs record the error class and
   SQLSTATE only.
8. No silent fallbacks: scripts and config fail loudly when something required is missing.
9. Brand assets are generated from `brand/`, never transcribed by hand. Use semantic tokens; deviations from
   kit tokens follow ADR-005.
10. Stop the processes you start by port and verify none are left running.
11. No paid service, API or GitHub Action without the owner's approval and a cost estimate.
12. Keep `docs/ai-log.md`, `docs/ASSUMPTIONS.md` and `docs/DECISIONS.md` current in the same PR as the change.
13. Talk to the owner in Spanish; code, commits and docs in English.

## Definition of done (from Stage 2)

Lint (including markdownlint), typecheck and tests pass; the relevant agents return PASS; Lighthouse runs for
any change to config, layout or the page shell; docs re-read against the code; the stage report lists
evidence for every claim.
