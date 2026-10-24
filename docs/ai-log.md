# AI log

What was delegated to Claude Code, what was corrected or rejected and why, and how it was validated.
Times are wall-clock estimates per stage; the git history is the other record.

## Stage 0: Discovery and environment (2026-10-24)

**Delegated:** reading the brief and the challenge PDF, checking tools and accounts, researching
fxreplay.com, writing the token generator, contrast report and planning docs.

**Owner decisions:** answer FX Replay's questions from the public site instead of waiting; stay on Node
22.23.4; approve the free-tier services ($0); protect `main`; disable the Supabase connector; start the
72-hour window at the first commit.

**Corrections and mistakes:**

- PDF reading failed (`pdftoppm` missing). Instead of installing poppler, the text was extracted with macOS
  PDFKit through `osascript`, into the session scratchpad, so nothing from `private/` entered the repo.
- Claude first proposed Node 24.22.1 LTS based on `node -v` (23.7.0, the system Node). The owner pointed out
  that nvm already defaults to 22.23.4 with the Vercel CLI installed there; Claude checked and switched the
  proposal to 22.23.4 (ADR-002). Lesson: check the version manager's default, not only the shell's `node`.
- `node --test scripts/brand/` failed on Node 22, which doesn't accept a directory; the tests run by file path.
- Claude noticed that the kit's own script falls back silently to `#333` for unknown references. The
  generator fails instead (working rule 10), and a test covers it.

**Validation:**

- `node scripts/brand/generate-tokens.mjs`: 45 primitives (44 plus the flagged `blue-950`), 60 semantic,
  2 font roles; counts are asserted against the numbers the brand README declares.
- `--check` exits 1 after a manual edit to `tokens.css` and 0 after restoring it.
- `node --test scripts/brand/brand.test.mjs`: 8 of 8 pass.
- Contrast ratios cross-checked against WCAG reference values (white on black 21.00; `#777777` on white 4.48).
- Facts in ASSUMPTIONS A-003 were read from the cited pages in the built-in browser.

- Claude reported "about 20 min" and then "about 45 min" for this stage without measuring either: both were
  guesses, against working rule 5. The owner asked how they were obtained. Measured from timestamps instead
  (below); from Stage 1 on, each stage logs `date` at its first and last command.

**Time (measured):** at most 24 min, against a 25 min budget. Lower bound of the start: the brief commit
`5e7556e` at 00:13:23 (UTC-6), which the kickoff prompt depends on. End: PR #1 created at 00:37:27. The
window includes the owner's reply time, so working time is lower.

**Budget used (measured):** the owner set the 6-hour budget to count from the first commit, `8888643` at
23:27:55. By the end of Stage 0 (PR #1 at 00:37:27), 69.5 min of the 360 min were used: about 45 min of
preparation before the kickoff and at most 24 min of Stage 0.

## Stage 1: AI-native system (2026-10-24)

**Start:** 00:45:41 (UTC-6), from `date`.

**Delegated:** CLAUDE.md, six agents, four project skills, settings with the env-guard hook and MCP policy,
`.mcp.json`, the config validator and its tests, vendoring four public skills.

**Owner decisions:** budget re-planned to 240 min for Stages 1 to 9 (wall-clock budget ends 05:27:55); four
vendored skills instead of seven.

**Corrections and judgement calls:**

- All four vendored skills expect `.agents/product-marketing.md`; the kickoff wants `docs/PRODUCT_CONTEXT.md`.
  A symlink keeps one document instead of a copy that would drift; the validator rejects a copy.
- `signup` lists a password as essential. Owner decision 9 overrides it; CLAUDE.md says project rules win.
- The PostHog connector exposes one `exec` tool for reads and writes, so the "allow named read tools" policy
  can't apply to it; it always asks (ADR-007).
- The env-guard hook also blocks `cp .env.example .env.local`: creating secret files stays a manual owner step.
- The format/lint hook is written but not registered: registering it before `package.json` exists would fail
  every edit. Stage 2 registers it.

**Validation:**

- `node scripts/validate-claude-config.mjs`: valid.
- `node --test scripts/validate-claude-config.test.mjs scripts/brand/brand.test.mjs`: 17 of 17 pass, including
  negative cases (missing agent, edit tools on a reviewer, unpinned commit, bundled script, paid API key,
  removed deny rule, missing hook script, unpinned MCP package, copied context file, env-guard cases).
- env-guard checked by hand on 7 inputs: `.env`, `.env.local` and `.env.production` blocked (exit 2);
  `.env.example`, `environment.ts` and `git status` allowed.
- Vendored references/ files were scanned for API calls and keys, not read in full; SKILL.md files were read in full.

**After the restart (00:58):** the project agents, the eight skills and the `playwright` project MCP server
loaded; Vercel and PostHog connectors connected; Supabase disabled. The owner saw no trust prompt for
`playwright` because `enabledMcpjsonServers` pre-approves it. `product-marketing` drafted
`docs/PRODUCT_CONTEXT.md` from fxreplay.com, pricing and signup, and the token cross-check went into A-008.

**Project agents used for the first time, both FAIL, both acted on:**

- `brand-copy-reviewer`: 1 blocker (a fact without a URL), 1 major (StoryBrand plan implied the journal is in
  the free plan, unsupported), 9 minor (testimonial quotes in a file drafting skills read, unlabelled
  inferences, wrong rule numbers). All fixed.
- `code-reviewer`: 1 blocker. The first env-guard regex let `cat .env*`, `.envrc`, `.env-local`,
  `.env.example.bak`, Glob and Grep globs through, and the hook failed open when the project path held a space
  or a symlink. Claude's own tests had missed all of it because they never ran the hook as a process. Fixed by
  matching path segments instead of the following character, comparing real paths at the entrypoint, and adding
  process-level tests (including a symlinked dir and a path with a space). Also fixed: the validator skipped a
  vendored skill that lost its SOURCE.md and missed `NotebookEdit` and `mcp__my_server`; deny rules gained the
  missing `git push`, `drizzle-kit` and `vercel --prod` forms; PLAN budget arithmetic corrected (282 min left at
  the Stage 1 start, not 284). The owner approved the settings changes before they were made, since a subagent
  can't authorise permission edits.
- The hardened hook immediately blocked Claude's own settings edit and this log entry, whose shell commands named
  `.env` files; both were redone without a shell command (a script file, and the Edit tool). Accepted false
  positive: any shell command text that mentions `.env`.

**Validation:** `node --test scripts/validate-claude-config.test.mjs scripts/brand/brand.test.mjs`: 20 of 20
pass. `node scripts/validate-claude-config.mjs`: valid.

**Second `code-reviewer` pass: FAIL, fixed with the owner's approval.** Globs that don't start with `.env`
(`.*`, `.e*`, `.[e]nv`), names split by quotes or backslashes (`.e''nv`), percent-encoded URLs and partial MCP
wildcards (`mcp__playwright__browser_*`) still got through. The hook now strips quotes and backslashes,
decodes URLs (blocking on decode failure), and tests each glob segment against known secret names; a leading
`*` is ignored because it doesn't expand to dotfiles. Grep's `pattern` (a content regex) is no longer checked,
so code can be searched for `.env` references. The hook and ADR-007 now say it is best-effort: text matching
can't see `grep -r` or shell variables, and the real controls are gitignore plus no production secrets in the
session. Lesson: Claude wrote the first guard and its tests from the cases it thought of; two adversarial
review passes found 20 more.

**Third `code-reviewer` pass (owner-requested): FAIL, final round applied with the owner's approval.** The
blocker was serious: an invalid glob such as `[z-a]` made the hook throw and exit 1, and Claude Code only
blocks on exit 2, so one extra token let any command through. The hook now fails closed (any internal error
exits 2), expands braces (`.{e,x}nv`, `.e{n,}v`), strips ANSI-C quote markers (`.e$'n'v`), and checks
`.env.test`, `.env.staging` and the `.local` variants; the root deny list gained the `.env-*` rule; ADR-007
names the two accepted false positives (shell text that mentions the name, and `sed 's/.*//'`). The owner
closed the review loop after this round: the hook is best-effort by design. Tests: 20 of 20 pass, now
including fail-closed process checks for an invalid glob and an oversized brace expansion.

**End:** 01:16:46, from `date`: 31 min against a 25 min budget.

## Stage 2: Scaffold, CI/CD and walking skeleton (2026-10-24)

**Start:** 01:18:54 (UTC-6), from `date`. Budget raised from 35 to 50 min by the owner ("no cuts").

**Delegated:** the Next.js scaffold, DB layer and first migration, test, E2E and Lighthouse configs, CI and
security workflows, README, version research (npm publish dates, action SHAs via `git ls-remote`).

**Corrections and judgement calls:**

- `pnpm audit --prod` found two critical RCE advisories in `next@16.4.0`. Claude broke its own two-week
  version rule to take the patched `next@16.4.2` and `zod@4.6.7`, and recorded why (ADR-009).
- TypeScript 7.0 was the newest release; Claude chose 5.9.3 because Next 16 support for 7.0 was unverified.
- `gh api .../commits/<tag>` returned 404 for some tags; SHAs were resolved with `git ls-remote` instead, using
  the peeled `^{}` commit so annotated tags don't pin a tag object. CodeQL `v4.39.1` was skipped as too new.
- Lighthouse first ran with the desktop preset; Claude switched to the default mobile profile, which is stricter.
- markdownlint flagged the delivered `brand/README.md`; it is ignored rather than edited (delivered source).
- `security-reviewer`: PASS with 6 minors. Fixed: migration errors now log class and SQLSTATE only;
  `migrate.mjs` refuses Neon outside a Vercel production build; checkout no longer persists credentials;
  pnpm pinned with its sha512; Dependabot 7-day cooldown. Recorded instead of gated: dev-only advisories.
  Not done without owner approval: deny rules for `drizzle-kit migrate` (settings change; the migrate guard
  covers the risk).
- `code-reviewer`: FAIL (3 major, 7 minor), all fixed: `lhci` and `build` scripts now set the CI env, so the
  README needs no env prefix; migrate-on-deploy moved into a tested pure function; ai-log and ADR-009 written;
  script budget set to 200,000 B (the stricter reading of 200 KB); preview database behaviour documented;
  health endpoint exempted from the error shape in ADR-004; smoke fetches time out after 10 s; test databases
  are closed; CLAUDE.md commands updated.

**Validation (local, Node 22.23.4):** `pnpm lint` 0 issues; `pnpm typecheck` clean; `pnpm test` 5 of 5;
`pnpm check:config` 25 of 25; `pnpm e2e` 4 of 4 with 0 axe violations (desktop and mobile); `pnpm lhci` median
of 3 (mobile, devtools): performance 0.99, accessibility 1, SEO 1, LCP 1656 ms, CLS 0, TBT 18 ms, HTML 2,806 B,
scripts 137,114 B; `pnpm audit --prod` no known vulnerabilities. Ports 3200 and 3300 checked free afterwards.

**Production verification and what it caught:**

- PR #3 CI: 8 of 8 green. The preview build log showed `VERCEL_ENV=preview; skipping migrations` on Node 22.x.
- First production build (after merging PR #3): `migrate: applied migrations with neon`, then the build failed
  inside `next/font/google` fetching Nunito Sans; the same code had built on preview minutes earlier. Fixed in
  PR #11 with `next/font/local` and pinned `@fontsource` packages, so builds never fetch fonts.
- Second production build: migrations applied, build completed. `BASE_URL=https://fx-replay-challenge.vercel.app
  pnpm smoke`: `GET /` 200 with the CTA, `GET /api/health` 200 `db=ok`.
- Clean clone from GitHub on Node 22.23.4, README commands as written: lint, typecheck, test, check:config,
  build and e2e pass; `pnpm lhci` failed LCP (median 2665 ms). Repeated runs were bimodal (about 1415 or
  2665 ms): a late Lato load re-painted the `h1`. Fixed in PR #13 with `display: 'optional'` for Lato; 9 of 9
  runs then measured about 1414 ms. Lesson: one passing Lighthouse run on the dev machine was not enough
  evidence; the clean clone caught a flaky gate.
- `main` now requires the five CI and security checks (ADR-006 amended).
- Not verified: the preview `/api/health` (previews are behind Vercel deployment protection, and bypassing it
  means changing protection settings, which the policy denies); runtime logs through the Vercel MCP (its token
  is not authorised for the `planetario-web` team scope; the read-only Vercel CLI was used for build logs).

**Mistakes in this stage:**

- Claude put `vercel env ls` in the same shell command as the HTTP probes. Listing env vars is a denied
  category; the auto-mode classifier blocked the whole command and nothing was read. The probes were rerun alone.
- The env-guard hook blocked a harmless Python one-liner (`r['audits'][...]` looks like an invalid glob once
  quotes are stripped, and the hook fails closed). The script moved to a file. Accepted false positive.
- Dependabot opened PRs #4 to #10 and #12 on its first run. None is merged: #12 bumps `react` without
  `react-dom`, and #6 and #8 bump CodeQL `init` and `analyze` separately. They are reviewed together in Stage 7.

- PR #13's previews failed with `BUILD_FAILED` "Resource provisioning failed" before any build step. The Vercel
  MCP (after the owner authorised the `planetario-web` team) showed 9 Git branches had built previews since
  Neon was connected, 7 of them Dependabot's. Inferred cause, not verified in Neon: each preview gets a Neon
  branch and the Free plan allows 10 per project. With the owner's approval: `vercel.json` disables
  deployments for `dependabot/**`, Dependabot PRs #4 to #10 and #12 were closed with a comment, and the owner
  deleted the stale Neon branches. Lesson: enabling Dependabot and per-preview database branches in the same
  stage multiplied preview resources; the consequence only showed on the next human PR.

**End:** recorded in the stage report from `date`.

## Stage 3: Users API (2026-10-24)

**Start:** 02:22:51 (UTC-6), from `date`.

**Delegated:** contract, migration, auth (admin token and signed cookie), idempotency, route handlers, 16
integration tests, docs.

**Judgement calls:** `zod/mini` schemas shared with the browser; email normalised before the unique index;
`__Host-` cookie prefix (forces `Path=/`, Secure, no Domain); keyset pagination; a malformed id returns 404 like
an unknown id; analytics failures are logged, never fail the request; idempotency without a transaction because
Neon's HTTP driver has none (risk recorded in ADR-004).

**Validation:** `pnpm test` 21 of 21 (16 new: 201 with cookie attributes and one conversion event; duplicate 409,
case-insensitive; 400 with per-field messages and unknown fields; malformed JSON and missing content type;
idempotent replay without a second event; key reuse conflict; 500 logging class and SQLSTATE without the
email; admin-only GET with keyset pages; cookie PATCH; cookie forbidden on email and on another id; missing,
tampered and expired cookies; admin email change, 409 and 404; invalid values; missing `ADMIN_TOKEN` fails
loudly). `pnpm typecheck` clean, `pnpm lint` 0 issues, `pnpm build` lists `/users` and `/users/[id]`.

**Reviews: both FAIL, all findings fixed.**

- `security-reviewer` (1 major, 4 minor). Major: an `Idempotency-Key` replay re-issued a fresh 30-minute
  profile cookie forever, so a leaked key became a long-lived credential. Fixed: replays only within 30 minutes,
  expired keys pruned, test proves an old key issues no cookie. Minors fixed: token parsing can't throw into a
  500 and rejects extra segments; cursors validate UUID and timestamp before Postgres; bodies read with a byte
  cap; cursor precision (below).
- `code-reviewer` (1 blocker, 3 major, 5 minor). Blocker, reproduced by the agent: the cursor used
  `toISOString()` (milliseconds) against microsecond `timestamptz`, so rows created within the same millisecond
  were skipped. Claude's pagination test missed it because each insert landed in a different millisecond. Fixed
  with a full-precision cursor and a test with sub-millisecond timestamps. Also fixed: `user_signed_up` now
  fires before the idempotency record is stored, and a storage failure no longer turns a created account into
  a 500 (test uses a trigger, after a first attempt that dropped the table broke the lookup too); a throwing
  analytics sink is tested; cookie `email` is 403 before validation; replays carry `Location`. The concurrent
  retry window is documented in ADR-004 instead of fixed.

**Validation after fixes:** `pnpm test` 26 of 26; `pnpm typecheck` clean; `pnpm lint` 0 issues.

**Production verification (after merging PR #14; the owner set `ADMIN_TOKEN` and `SESSION_SECRET` in Vercel):**

- Build log via the Vercel MCP: `migrate: applied migrations with neon`; routes `/users` and `/users/[id]`;
  deployment READY with the `fx-replay-challenge.vercel.app` alias. Runtime errors: none.
- `pnpm smoke`: `/` 200, `/api/health` 200 `db=ok`.
- `node scripts/verify-api.mjs` (no secrets): 12 of 12 (201 with all cookie attributes, idempotent replay,
  409 `EMAIL_TAKEN` case-insensitive, 409 `IDEMPOTENCY_CONFLICT`, 400 with `fields.email`, cookie PATCH 200,
  cookie email 403, no credentials 401, cookie on another id 403, admin GET without token 401, request ids).
- Admin `GET /users`, run by the owner in their own terminal with `read -rs` (the token never entered the
  session): 200 with 1 user and no next cursor; a wrong token 401.
- Data written to production: one test user, id `edcb55da-9d4a-4379-a08b-67688980f16f`, email on the reserved
  `example.test` domain, with a test profile. Stage 6 excludes `example.test` traffic from the funnel.
- Process note: the owner's first two attempts ran from the chat's `!` input, which has no TTY (so `read -rs`
  read nothing) and would have put the output in the conversation. Instructions now say "your own terminal".

**End:** 02:46:27, from `date`: 24 min against a 35 min budget.

## Stage 4: Signup flow (2026-10-24)

**Start:** 02:49:44 (UTC-6), from `date`.

**Delegated:** the `signup` skill audit, the form and profile step, the browser API client, 18 new E2E tests
(9 scenarios on desktop and mobile).

**Corrections and judgement calls:**

- First timeout design used `AbortSignal.timeout`, which Playwright's clock can't drive; switched to
  `setTimeout` with `AbortController` so the timeout test runs in milliseconds instead of waiting 10 s.
- 4 E2E tests failed on the first run because Next.js injects its own `role="alert"` route announcer; the
  selector was scoped to the form. The `__Host-` cookie worked on `http://localhost` as expected.
- The env-guard hook blocked two shell commands containing the header name in brackets (an invalid glob range
  once quotes are stripped); the files were written with the Write and Edit tools instead. Same accepted
  false-positive class as in Stage 2.

**Validation:** `pnpm e2e` 22 of 22 (desktop and mobile), axe 0 violations in idle, validation error, 409,
server error, success and profile-saved states; `pnpm test` 26 of 26; `pnpm lint` 0 issues; `pnpm typecheck`
clean; `pnpm lhci` medians (mobile, devtools): performance 1, accessibility 1, SEO 1, LCP 1465 ms, CLS 0,
TBT 21 ms, HTML 3,473 B, scripts 156,971 B. Ports 3200 and 3300 free afterwards.

**Reviews:**

- `brand-copy-reviewer`: FAIL. Blocker: the Terms and Privacy URLs and the notice wording had no sourced
  entry in A-003 (they were only in QUESTIONS). Fixed: A-003 rows with the verbatim notice and both URLs; the
  form uses that notice in the second person; the "walking skeleton" line visible to production traffic was
  replaced with a sourced value line; the timeout message now states the real guarantee ("Trying again won't
  create a second account"); ADR-005 rows for the error border and the focus color; focus rings and accent
  color on the profile controls; theme font aliases renamed so they no longer shadow the generated tokens.
- `code-reviewer`: FAIL. Major: Claude's reduced-motion test could not fail (the button has no transition).
  Replaced with a test on `scroll-behavior` that is `smooth` by default and `auto` under reduce. Minors fixed:
  "Skip" ignored during a save; a 2xx without a user is no longer a success; `IDEMPOTENCY_CONFLICT` resets the
  key; the server stores the replay record before tracking and a racing retry waits up to 600 ms for it; 7
  unit tests for the browser client (non-JSON 502, empty 2xx, network failure, timeout, header).

**Validation after fixes:** `pnpm test` 33 of 33; `pnpm e2e` 22 of 22; `pnpm typecheck` clean; `pnpm lint`
0 issues.

- `qa-a11y-tester`: PASS (axe 0 in every state at 360 and 1440 px, tested by hand with its own server) with 8
  minors. Fixed: "Try again" unmounted the focused button and dropped focus to `<body>` (now focus moves to the
  submit button first); the busy state is announced through `role="status"`; the error is no longer both
  focused and in a live region (read twice); focus targets show a ring; the mobile project runs at 360 px; E2E
  now asserts focus on errors and success, runs axe in timeout and network states, tabs for real in the
  keyboard test, and covers network failure and the empty email. Recorded instead: inline legal links below
  44 px (WCAG 2.5.8 exception). Not covered by E2E, verified by hand by the agent: profile 500 and 401, skip
  while saving.
- Flakiness Claude introduced and caught: the new network test failed 1 run in 3 because focus was moved in
  `requestAnimationFrame`, racing React's commit; moved to `useEffect`, then 3 of 3 full runs passed. A unit
  test (pagination) also failed once because back-to-back inserts can share `created_at`; it now inserts
  explicit timestamps. markdownlint started linting Playwright's report folder; reports are now ignored.

**Validation (final):** `pnpm e2e` 26 of 26, three consecutive runs; `pnpm test` 33 of 33, three consecutive
runs; `pnpm lint` 0 issues; `pnpm typecheck` clean. Ports 3200 free.

**Production verification (after merging PR #16):** deployment READY (Vercel CLI `inspect --wait`); `pnpm smoke`
200 and `db=ok`. With the Playwright MCP at 360 x 800 on `https://fx-replay-challenge.vercel.app/#signup`:
signup with `smoke+prod-signup-0315@example.test` reached "Your free account is ready" with focus on the
heading; the profile step (first name, intermediate, futures) saved with focus on "Profile saved. Thanks.";
axe-core 4.10.2 on that final state: 0 violations; no horizontal overflow at 360 px; the profile cookie is not
readable from JavaScript (HttpOnly). Vercel runtime errors: none. Console: one 404 for `/favicon.ico`, fixed
in Stage 5 with an icon generated from the brand isotype.
Data written to production: test user `smoke+prod-signup-0315@example.test` with a test profile.

**End:** 03:16:41, from `date`: 27 min against a 35 min budget.
