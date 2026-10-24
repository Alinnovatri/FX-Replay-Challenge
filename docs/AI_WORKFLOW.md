# AI-native workflow

Claude Code built this project inside a system that constrains, reviews and records its work. The system is
committed: [CLAUDE.md](../CLAUDE.md), [.claude/](../.claude), [.mcp.json](../.mcp.json). The full, dated record
of what was delegated, corrected and rejected is [ai-log.md](ai-log.md); this file explains the setup and picks
examples from it.

## Project-level instructions

`CLAUDE.md` gives every session the stack, the commands, 13 rules and a definition of done. The rules that
mattered most in practice: no claim without evidence from a command, log or URL; no invented facts about FX
Replay (only those recorded with a source in `docs/ASSUMPTIONS.md` A-003 and `docs/PRODUCT_CONTEXT.md`); no
promises of trading performance; no secrets in the session; no PII in analytics; no silent fallbacks; brand
assets generated, never transcribed; and "reviews use the project agents, never similarly named built-in
skills".

## Agents (`.claude/agents/`)

Six reviewers with minimal tools (none can edit files) and one fixed output format: `Verdict: PASS | FAIL` plus a
table of severity, location, rule, finding and fix.

| Agent | Scope | Used in stages |
| --- | --- | --- |
| `code-reviewer` | Diff correctness, contract drift, tests, docs against code | 1, 2, 3, 4 |
| `security-reviewer` | Auth, cookies, secrets, supply chain, abuse | 2, 3, 6 |
| `qa-a11y-tester` | E2E states, axe, keyboard, reduced motion (Playwright MCP) | 4, 5 |
| `analytics-auditor` | Events against the taxonomy, PII, test tagging, one metric definition | 6 |
| `perf-seo-auditor` | Lighthouse budgets, LCP element, metadata | 5 |
| `brand-copy-reviewer` | Facts against sources, performance claims, tokens | 1, 4, 5 |

## Skills (`.claude/skills/`)

- **Project skills:** `add-tracked-event`, `add-migration`, `stage-checkpoint`, `pre-submit-audit`. They encode
  the repeatable procedures (for example, a migration is additive, runs on PGlite in tests and reaches Neon only
  through migrate-on-deploy).
- **Vendored public skills** (MIT, pinned to a commit, SKILL.md read before committing, ADR-008):
  `product-marketing` (wrote `docs/PRODUCT_CONTEXT.md` from fxreplay.com), `signup` (audited the signup
  friction), `copywriting` (drafted the landing copy), `cro` (audited the page). They produce drafts; the agents
  review the output.

## Hooks and permissions (`.claude/settings.json`)

- `env-guard` (PreToolUse): blocks tool calls that name a `.env` file; fails closed; best-effort by design.
- `format-lint` (PostToolUse): formats and lints every edited file.
- Deny rules: no merge or push to `main`, no Vercel env-var changes, promotions or rollbacks, no `drizzle-kit
  push`, no reading credentials. Read-only MCP tools are allowed by exact name; everything else asks.
- `scripts/validate-claude-config.mjs` checks the whole setup in CI (agents' tools, skill sources, pinned MCP
  packages, hook scripts).

## MCP

| Server | Used for |
| --- | --- |
| Playwright (`.mcp.json`, pinned) | Reading fxreplay.com and its computed styles, QA of the signup in production, the image inventory |
| Vercel (connector) | Deployment status, build logs, runtime errors, diagnosing a failed preview |
| PostHog (connector) | Confirming that production events arrived with the right properties and no PII |

In a production FX Replay setup, the same agents would also use a GitHub MCP for PR context, the PostHog MCP to
read experiment results against EXPERIMENT.md's decision rules (`analytics-auditor`), and Sentry for errors
behind failed signups, each with a scoped read-only token.

## How the pieces work together

Each stage followed the same loop: the owner approves a short plan; Claude implements in small commits; the
format-lint hook runs on every edit; Claude runs lint, typecheck, tests, E2E and Lighthouse; the relevant agents
review in parallel; Claude fixes the findings and re-runs the checks; the owner merges a PR whose five required
checks are green; Claude verifies production with the MCP servers and logs the evidence and the time.

## Where AI improved execution

- **Agents caught real bugs Claude had written and its own tests had missed:** keyset pagination skipped rows
  created within the same millisecond (reproduced by `code-reviewer`); an idempotency replay could mint fresh
  profile cookies forever (`security-reviewer`); the env-guard hook failed open on an invalid glob; "Back" in the
  quiz discarded answers while the test hid it (`qa-a11y-tester`); `?fxr_test=1` let a shared link hide real
  conversions (`security-reviewer`); `referrer_domain` always held the site's own host (`analytics-auditor`).
- **Verification beyond "it works on my machine":** the clean-clone test caught a flaky Lighthouse LCP gate;
  production verification caught a build that failed fetching Google Fonts; the Vercel MCP showed previews
  failing with "Resource provisioning failed" after Dependabot's first run (most likely the Neon free-tier
  branch limit; inferred, not confirmed inside Neon).
- **Speed on breadth:** version research with publish dates, action SHAs, the sample-size table, 48 E2E tests
  across two viewports.

## Where AI output was corrected or rejected

- **Owner corrections:** time estimates reported without measuring them (replaced by `date` timestamps); Node 24
  proposed when the machine already ran 22; the 6-hour budget recounted as wall-clock from the first commit; the
  landing "felt basic" (accepted; the redesign is a documented next step); the quiz-first signup proposed as a
  test instead of a replacement (owner chose the A/B).
- **Claude rejected or narrowed its own changes:** a `noindex` on the variant that would have de-indexed `/`;
  a second `bash` command that included `vercel env ls` (blocked by the classifier, rerun without it); a global
  rename that also renamed query parameters; skills' advice that conflicted with owner decisions (a password at
  signup).
- **Subagents can't authorise permission changes:** every settings or hook change suggested by an agent was
  surfaced to the owner and applied only after approval.

## What the owner did, not the AI

Product decisions (no password, A/B instead of replacement, scope cuts and the overrun), every merge to `main`,
creating the Vercel project, the Neon integration and the three secrets, and the admin check run with
`read -rs` in their own terminal.

## How AI-generated work was validated

Tests that fail without the behaviour (several were tightened after reviews showed they couldn't fail),
two consecutive E2E runs after every flaky-looking failure, Lighthouse on both pages, required CI checks,
production checks with the MCP servers, and agent reviews whose findings are all listed in `ai-log.md` with
how each was resolved.
