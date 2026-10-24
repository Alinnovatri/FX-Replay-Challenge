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

**Time:** about 45 min against a 25 min budget. The overrun came from resolving the FX Replay questions on
the public site, which the owner asked for and which moves part of the Stage 1 research forward.
