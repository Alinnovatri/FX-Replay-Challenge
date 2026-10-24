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
