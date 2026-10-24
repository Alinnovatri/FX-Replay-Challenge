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

## Stage 5: Landing, brand and the quiz-first variant (2026-10-24)

**Start:** 03:20:37 (UTC-6), from `date`. Budget raised from 40 to 55 min by the owner, who added a quiz-first
signup with a progress bar and more animations to this stage.

**Owner decision:** the owner felt that asking for the email first hurts signups. Claude pointed out that the
`signup` skill and FX Replay's own signup are email-first and that there was no data either way, and proposed
building quiz-first as the A/B variant with email-first as control. The owner chose that (ADR-011).

**Delegated:** copy with the `copywriting` skill (Situation A), the `cro` audit, the landing sections, the
quiz variant, SEO routes, the asset sync script, motion, 16 new E2E tests.

**`cro` audit (applied or recorded):** quick wins already in place: the form is in the hero and visible
without scrolling at 360 px (E2E asserts it), "Free plan. No credit card required." sits next to the button,
and the header carries only the logo and one CTA. Test ideas for Stage 6: quiz-first vs email-first (the
experiment), the proof line next to the button vs under the subtitle, and the headline framed around the
free plan vs around testing before trusting.

**Corrections and judgement calls:**

- First scroll-driven animation faded sections in with opacity; axe failed color contrast on desktop where a
  section was half faded. Switched those to transform only; the hero entrance keeps opacity because it ends
  in 600 ms.
- First variant page had `noindex`, which cost it 0.69 SEO in Lighthouse and, worse, would have de-indexed
  `/` once Stage 6 serves the variant there. Removed; the canonical to `/` handles duplication.
- `next/image` replaced a raw `img` for the logo after the format-lint hook flagged it.
- The env-guard hook blocked a shell command again (Lighthouse audit names in brackets); the script moved to a
  file.

**Validation:** `pnpm e2e` 40 of 40, two consecutive runs (landing and quiz on desktop and 360 px mobile, axe
0 in every tested state, SEO tags and JSON-LD, robots, sitemap, icon and OG image served, reduced motion);
`pnpm test` 34 of 34; `pnpm check:config` 25 of 25 with the new asset check; `pnpm lint` 0 issues.
`pnpm lhci` medians (mobile, devtools, 3 runs each): `/` performance 1, accessibility 1, SEO 1, LCP 1540 ms,
CLS 0, TBT 14 ms, HTML 6,696 B, scripts 163,201 B; `/variants/quiz` 0.99, 1, 1, LCP 1555 ms, CLS 0, TBT 16 ms,
HTML 6,993 B, scripts 165,249 B. Ports 3200 and 3300 free afterwards.

**Reviews:**

- `perf-seo-auditor`: PASS. All budgets met on both pages; the LCP element is the `h1` in all 6 runs (text,
  render delay only); no third-party bytes. Minors fixed: reduced motion now also stops the scroll-driven
  animation; the OG card loads Lato 900 instead of the default font; JSON-LD `url` points at fxreplay.com.
  Recorded, not done: lazy-preloading the 4 font weights not used above the fold (LCP already 1.5 s), and about
  55 KiB of unused JS (scripts at 163 KB of 200 KB).
- `brand-copy-reviewer`: FAIL. Blocker: "does not execute real trades" was read on fxreplay.com in Stage 1 but
  never recorded in A-003; added with source, plus "prices in USD" for the JSON-LD currency. Majors fixed: the
  risk disclosure is now linked; JSON-LD `url` is fxreplay.com, not this site; the success state says the
  account does not sign the user in to the FX Replay app (A-004); removed "You can change this later" and
  "You can add these details later", which the UI couldn't honour. Minors fixed: missing `bg-tertiary` theme
  mapping (the progress track had no color), card hover border uses `border-brand`, ADR-005 row extended to
  card borders, OG colors resolved from semantic tokens, source comments cite recorded paraphrases, a stacked
  negation and an aphorism in the copy rewritten.
- `qa-a11y-tester`: FAIL. Majors fixed: reduced motion didn't stop the `view()` timeline animation (a
  time-based duration has no effect on a scroll timeline; now gated by `prefers-reduced-motion: no-preference`,
  with an E2E test); Back on step 2 discarded the chosen markets, and Claude's own test hid it by checking a
  different box afterwards (now saved on Back, and the test asserts Futures stays checked). Minors fixed: Back
  from step 3 keeps the typed email; reduced motion also zeroes animation delays; the progress bar and step
  heading disappear after success; step 1 error marks the `radiogroup` invalid and clears on change (ESLint
  rejected `aria-invalid` on a radio, correctly). Recorded: inline footer and notice links are below 44 px
  (WCAG 2.5.8 inline exception, ADR-010).

**Validation after fixes:** `pnpm e2e` 42 of 42, two consecutive runs; `pnpm test` 34 of 34; `pnpm check:config`
25 of 25; `pnpm lint` 0 issues; `pnpm typecheck` clean. `pnpm lhci`: `/` 1, 1, 1, LCP 1535 ms, CLS 0, TBT 18 ms,
HTML 6,711 B, scripts 163,301 B; `/variants/quiz` 0.99, 1, 1, LCP 1558 ms, CLS 0, TBT 13 ms, HTML 7,032 B,
scripts 165,458 B.

**After the review fixes:** the owner merged PR #18 at 03:56 (UTC-6). Production check at 04:50: `pnpm smoke`
OK; `/variants/quiz`, `/robots.txt`, `/sitemap.xml`, `/icon.svg` and `/opengraph-image` all 200.

**Owner feedback (04:2x): the landing felt basic in content and look and feel.** Claude agreed, audited
fxreplay.com again with the Playwright MCP (sections not used yet: Mentor AI, FXR Script, the "is your edge real"
questions, Monte Carlo, multichart; 6 real product screenshots on FX Replay's CDN, 10 to 121 KB each) and
proposed a redesign (bento benefits, feature tabs with screenshots, who-it's-for, trust strip; CSS-only, no
shadcn because Radix would add client JavaScript). It did not fit: 60 min were left on the 6-hour clock and P0
deliverables (analytics, experiment, docs) were still open, and the brief's cut order puts visual polish first.
The owner chose to do Stages 6 and 8 first and approved downloading the 6 screenshots for the redesign later.

**End:** 04:50:53, from `date`: 90 min against a 55 min budget (the owner's redesign request and review time
are inside that window).

## Stage 6: Analytics and experiment (2026-10-24)

**Start:** 04:50:53 (UTC-6). **Owner decision:** do Stages 6 and 8 in full even though the 6-hour budget
(ending 05:27:55) is exceeded; document the overrun. The overrun is tracked from 05:27:55 onwards.

**Delegated:** the event contract, relay, PostHog sink, proxy assignment, browser tracker, 9 unit tests and 6
E2E tests for events and assignment, ANALYTICS.md and EXPERIMENT.md with the sample-size table.

**Corrections and judgement calls:**

- First tracker used `sendBeacon` with a JSON Blob; Playwright can't read beacon bodies, so the E2E couldn't
  verify what was sent. Switched to `fetch` with `keepalive`, which survives navigation the same way.
- Random assignment at `/` would have made the control E2E tests land on the quiz half the time. Playwright now
  starts with a `fxr_variant=control` cookie, and a separate test checks first-visit assignment and stickiness.
- The relay rejects events without a visitor id (400) instead of inventing one, so relay events always join the
  funnel; the conversion falls back to the user id when the cookie is missing.
- Visiting `/variants/quiz` directly moves the visitor to the quiz arm (for QA); recorded as a known limit.
- Sample sizes computed with `python3 -c` and `statistics.NormalDist`: 8,155 per arm at 5 % baseline and +20 %
  relative MDE; 31,231 at +10 %; 13,911 at 3 %; 4,917 at 8 %.

**Validation:** `pnpm test` 44 of 44; `pnpm e2e` 48 of 48, two consecutive runs; `pnpm lint` 0 issues;
`pnpm check:config` 25 of 25. `pnpm lhci` (both pages, mobile, devtools, 3 runs): `/` 1, 1, 1, LCP 1540 ms,
CLS 0, TBT 17 ms, HTML 7,048 B, scripts 163,631 B; `/variants/quiz` 0.99, 1, 1, LCP 1559 ms, TBT 17 ms, HTML
7,363 B, scripts 165,857 B. Lighthouse visits `/` without cookies, so the proxy may assign either arm.

**Reviews: both FAIL, all findings fixed.**

- `security-reviewer`. Major: `?fxr_test=1` let anyone tag real visitors as test traffic with a shared link,
  hiding their conversions from the funnel. Query overrides (`fxr_test`, `fxr_variant`) now work outside
  production only; scripts use the `x-fxr-test` header, which a cross-site page can't send without a preflight.
  Minors fixed: the relay rejects a foreign `Origin` (403); cookies use the `__Host-` prefix; E2E and Lighthouse
  use `ANALYTICS_SINK=log` so their events never reach PostHog (the comment claiming the fake key kept events
  local was wrong); `POSTHOG_PROJECT_KEY` documented in `.env.example`. Noted for Stage 7: rate limiting and
  signed visitor ids.
- `analytics-auditor`. Majors fixed: `referrer_domain` came from the relay request's `Referer`, so it was always
  the site's own host; it is now the hostname of `document.referrer`, sent by the page and validated by the
  contract. The docs claimed the user id is never the `distinct_id`, but it is the fallback without a visitor
  cookie; server events now carry `has_visitor_id` and the metric excludes those conversions. PLAN restated the
  metric definition and had already drifted; it now links to ANALYTICS. Minors fixed: the definition names its
  computation (the same ordered 1-day funnel EXPERIMENT reads); `quiz_step_completed` fires once per step; the
  `example.test` rule is documented as tagging `user_signed_up` only; Lighthouse sends the test header; unit
  tests assert no conversion on 400 and `IDEMPOTENCY_CONFLICT`; the analytics catch can't throw on a non-Error.
- Claude's own slip during the fixes: a global rename to `__Host-` cookie names also renamed the query
  parameters (`?fxr_variant`, `?fxr_test`) in the proxy and one test; caught on reading the file back, and the
  proxy was rewritten.

**Validation after fixes:** `pnpm test` 46 of 46; `pnpm e2e` 48 of 48, two consecutive runs; `pnpm lint` 0
issues. `pnpm lhci`: `/` 0.99, 1, 1, LCP 1560 ms, CLS 0, TBT 16 ms, HTML 7,187 B, scripts 163,694 B;
`/variants/quiz` 0.99, 1, 1, LCP 1557 ms, CLS 0, TBT 17 ms, HTML 7,505 B, scripts 165,956 B.
