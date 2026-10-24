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
