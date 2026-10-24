# FX Replay Challenge Guide 

Oct 23, 2026 · @Gibran Martínez

**Assumptions and reading scope.** I read the full PDF: 9 pages, all legible. The document has no printed page numbers, so I cite pages in order (p. 1 to p. 9). I don't assume your experience level. Where I estimate times, I give ranges and explain what they depend on.

## 1. Overview

- **Business objective:** increase the conversion rate from marketing traffic to account creation, with an experience centered on "Try FX Replay Free" (p. 1).
- **What they want to see:** how you solve a growth problem end-to-end. They evaluate technical judgment, autonomy, execution quality, trade-offs and using AI as real leverage (p. 1). They don't want framework trivia, algorithms or a large application (p. 1 and p. 9).
- **Scope:**
  - *Build:* landing page, signup flow and Users API.
  - *Design and document*, implementing what's reasonable: analytics, A/B experiment, performance, SEO, accessibility and infrastructure.
  - *Build and commit:* the Claude Code working system.
- **Deliverables (p. 6–8):**
  1. Working implementation: repo URL, live URL if deployed, local setup instructions.
  2. Architecture document.
  3. Analytics plan.
  4. Experiment proposal.
  5. AI-native workflow.
  6. Performance review.
- **After submission:** a 60-minute technical review, where they may introduce a new requirement (p. 9).

## 2. Essential requirements

| Type | Requirement | Status | Page |
| --- | --- | --- | --- |
| Functional | Responsive landing page with clear value proposition, primary CTA, polished UI and accessibility | Mandatory | 1–2 |
| Functional | Real or simulated signup with user states, validation, error handling, loading/async and a successful conversion state | Mandatory | 2 |
| Functional | Users API: create, update and list users | Mandatory | 2 |
| Functional | Signup calls the API; it can't be a standalone demo | Mandatory | 2 |
| Functional | Recreating the full authentication system | Not required | 2 |
| Technical | Persistence of your choice, documenting the choice, rationale and trade-offs | Documentation mandatory | 2 |
| Technical | API contract, frontend/backend communication, validation, failures and async behavior | Evaluated | 2 |
| Technical | Event taxonomy: name, trigger, properties, user/session context | Mandatory | 3 |
| Technical | Funnel: entry, intermediate steps, conversion event and metric | Mandatory | 3 |
| Technical | Analytics tool: GA4, GTM, PostHog, Segment, Amplitude or other | Free choice | 3 |
| Technical | Explain how to keep the data accurate and trustworthy | Mandatory | 3 |
| Technical | At least 1 A/B experiment: hypothesis, control, variant, metric and decision (ship / continue / reject) | Mandatory | 3–4 |
| Technical | Claude Code as a central part of the workflow | Mandatory | 5 |
| Technical | Project-level instructions | Mandatory | 5 |
| Technical | At least 1 reusable skill, command or workflow | Mandatory | 5 |
| Technical | One or more agents with clear responsibilities | Mandatory | 5–6 |
| Technical | MCP where it adds value, or document what you'd connect, why, and how agents would use it | Mandatory (one of the two) | 6 |
| Technical | Commit the configuration and instruction files | "Where practical" | 8 |
| Non-functional | Core Web Vitals, loading and rendering strategy, assets, JS, third-party scripts | Consider and explain | 4 |
| Non-functional | SEO: metadata, semantic structure, technical SEO, structured data | Consider | 4 |
| Non-functional | Explain the accessibility considerations | Mandatory | 4 |
| Non-functional | Infrastructure: hosting, deployment, CI/CD, DNS, CDN, caching, observability, security, reliability | Describe, don't build | 5 |
| Non-functional | Easy for another engineer to run and review | Mandatory | 7 |
| Non-functional | Brand interpretation within the "provided" typography and palette | Evaluated | 9 |

**Optional or conditional:**

- Live deployment: p. 7 says "if deployed" and p. 9 lists "\*Live deployment" with no footnote. Resolved: we deploy (see Owner decisions).
- Architecture diagram: "welcome" (p. 7).
- A real MCP integration: the documented alternative exists (p. 6).

**Constraints:**

- **Time:** about 6 hours of work; submit within 72 hours of receiving it (p. 8).
- **Technology:** only Claude Code is mandatory; everything else is your choice.
- **Submission format:** repo URL and deployment (p. 9). Documents as Markdown inside the repo (confirmed).
- **Priorities:** they value trade-offs over completeness. Document what you skip, along with your assumptions (p. 8).

## 3. Evaluation criteria

**Explicit in the PDF:**

- Engineering and architecture decisions (p. 9).
- Analytics and experimentation approach (p. 9). For the experiment, reasoning and methodology matter more than complexity (p. 4).
- AI-native workflow (p. 9). They evaluate the system you build around AI, not prompt count (p. 5–6).
- Web performance and production thinking (p. 9).
- Design and UX (p. 9).
- Brand interpretation, evolving it where appropriate (p. 9).
- Ownership, prioritization and technical judgment (p. 9).
- Being able to explain what you built, why, how you'd measure the result and how you'd operate it (p. 1).
- Explaining what you delegated to AI, what you did yourself, what you rejected or corrected, and how you validated (p. 6).
- A small, well-executed solution beats a large, complex one (p. 9).
- How you reason through the new requirement in the interview (p. 9).

**My inferences (not written in the PDF):**

- They'll likely review the git history. Small, readable commits show how you worked with AI.
- They'll expect docs and code to match: the taxonomy's events should actually fire.
- Conversion should be counted on server confirmation (user created), not just on the click.
- A public `GET /users` exposes emails. How you protect or document that says a lot about your production judgment.
- The surprise requirement could touch any layer: a new field, an extra step, another language, rate limiting or an experiment change. This is speculation. It's why a modular design with centralized validation pays off.

## 4. Task breakdown

Priorities: **P0** = mandatory, **P1** = high value, **P2** = only if time allows.

| # | Task | Prio. | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| T1 | Send questions and record assumptions | P0 | — | `docs/ASSUMPTIONS.md` exists |
| T2 | Research the product and brand on FX Replay's public site (as far as I know, it's a trading backtesting/replay platform; verify it) | P0 | — | Value proposition defined; colors and fonts as tokens |
| T3 | Write `CLAUDE.md` | P0 | T1 | Includes stack, commands, conventions, limits (what not to do) and definition of done |
| T4 | Create agents in `.claude/agents/` | P0 | T3 | At least 1 (ideally 2–3, e.g. QA/a11y, analytics, reviewer); role, tools and output defined; actually used |
| T5 | Create a reusable skill or command | P0 | T3 | E.g. `/add-tracked-event` or `/pre-submit-audit`; run at least once |
| T6 | Project scaffold and CI | P0 | T3 | GitHub repository `FX-Replay-Challenge` (see **Names** below); install/dev work; lint, typecheck and tests run in CI; `pnpm lint` also lints Markdown (table column count); every local check script sets the same env vars CI sets for it |
| T7 | Contract and Users API (`POST`, `PATCH`, `GET`) | P0 | T6 | Shared schema; consistent errors (400/404/409/500) with a uniform shape; duplicates → 409; tests |
| T8 | Persistence | P0 | T7 | Works locally and deployed; trade-offs documented |
| T9 | Signup flow | P0 | T7 | Idle, submitting, error and success states; client and server validation; no double submit; accessible errors; uses the real API |
| T10 | Landing page | P0 | T2 | Value proposition and CTA visible without scrolling; works from 360 to 1440 px; semantic HTML |
| T11 | Analytics: taxonomy and funnel (P0) + instrumentation (P1) | P0/P1 | T9, T10 | Events match the taxonomy; server-confirmed conversion; no PII; values read from the DOM validated before sending; smoke and test traffic tagged and excluded from the funnel; verified in debug mode |
| T12 | Experiment: document (P0) + feature flag (P2) | P0/P2 | T11 | Hypothesis, control, variant, primary metric (linked to its single definition in the analytics plan, not reworded), guardrails, sample size/MDE and decision rules |
| T13 | Accessibility, performance and SEO pass | P0 | T9, T10 | No critical axe violations; Lighthouse reviewed; metadata, OG and JSON-LD |
| T14 | Deploy | P0 | T8 | Vercel project `fx-replay-challenge` (see **Names** below); working URL; env vars configured; no secrets in the repo |
| T15 | Docs: README, ARCHITECTURE, ANALYTICS, EXPERIMENT, AI\_WORKFLOW, PERFORMANCE | P0 | All | Cover every bullet on p. 7–8 |
| T16 | Mermaid diagram | P2 | T15 | Renders on GitHub |
| T17 | Real MCP (P2) or documented proposal (P0) | P0/P2 | T3 | `.mcp.json` with documented usage, or the proposal |
| T18 | Clean-clone test and interview prep | P0 | All | A fresh clone **from the remote** (not a local copy) runs using only the README, on the exact Node version in `.nvmrc`; every command in the README's checks table passes as written; demo script ready |

**Names.** The project is called **FX Replay Challenge** everywhere, written in the format each platform accepts:

| Where | Name | Format rule |
| --- | --- | --- |
| GitHub repository | `FX-Replay-Challenge` | GitHub doesn't allow spaces (it turns them into hyphens) and keeps capitals. URL: `github.com/<owner>/FX-Replay-Challenge` |
| Vercel project | `fx-replay-challenge` | Lowercase only, letters, digits, `.`, `_` and `-`, up to 100 characters. Production URL: `https://fx-replay-challenge.vercel.app` (if that subdomain is taken, Vercel adds a suffix; record the real URL in the README) |
| Display name (README title, docs, `<title>`) | FX Replay Challenge | Free text, with spaces and capitals |
| Derived from the above | `fx-replay-challenge` in `package.json` `name` and the local folder | npm requires lowercase without spaces; the folder matches so paths have no spaces to escape |

Create both the repository and the Vercel project with these names from the start (T6, T14): renaming later changes the Git remote and the production URL that the README, docs and smoke tests point to.

**Design idea:** use `PATCH` in an optional profile step after signup (e.g. experience level or market traded). That way "update user" has a real purpose instead of being decorative.

## 5. Roadmap

| Phase | Content | Estimated range |
| --- | --- | --- |
| 0. Preparation | Read, send questions, research the brand, choose the stack, open `docs/ai-log.md` | 20–40 min |
| 1. AI system + scaffold | CLAUDE.md, agents, skill, repo, CI | 40–70 min |
| 2. API + persistence | T7, T8 with tests | 45–75 min |
| 3. Signup | T9 wired to the API | 45–75 min |
| 4. Landing | T10 | 60–90 min |
| 5. Analytics | T11, experiment document (T12) | 30–60 min |
| 6. Quality + deploy | T13, T14 | 30–60 min |
| 7. Documentation | T15 | 45–75 min |
| 8. Review and submission | T18 and checklist | 20–30 min |

- **Total:** roughly 5.5 to 9.5 hours.
- **The upper bound exceeds 6 h.** If you fall behind, cut in this order: P2, extra visual polish and the experiment flag. Never cut P0.
- **Times depend on:**
  - your familiarity with the chosen stack;
  - how much design you create from scratch;
  - deployment friction;
  - how much AI output you need to correct.
- **Why this order:**
  - The AI system comes first so the git history shows it guided development.
  - The API comes before signup so the flow integrates the real contract.
- **Tip:** from minute one, log what the AI got wrong and how you fixed it. Reconstructing it at the end is hard, and it's exactly what they'll ask about.

## 6. Recommended tools

| Category | Tool | Justification |
| --- | --- | --- |
| AI (mandatory) | Claude Code with `CLAUDE.md`, `.claude/agents/`, `.claude/skills/` or `.claude/commands/`, `.mcp.json` | Required by the PDF; keeping it in the repo lets them review the system (p. 8) |
| Framework | Next.js (App Router) + TypeScript; alternative: Astro with a light API | Static/SSG landing, API in the same repo and simple deployment. Astro ships less JS. Pick the one you know best |
| Validation | Zod | One schema shared by client and server acts as a single contract |
| Persistence | SQLite locally; managed Postgres (Neon/Supabase) when deployed; Drizzle or Prisma | On serverless, memory and files don't persist between invocations |
| Styling | Tailwind or CSS Modules with brand tokens; self-hosted fonts (`next/font`) | Brand consistency and less CLS |
| Analytics | PostHog; alternative: GA4 + GTM | PostHog combines funnels, flags and experiments, and supports server-side capture. GTM adds third-party weight (an INP risk) |
| Unit / integration | Vitest | Fast; tests validation and handlers |
| E2E | Playwright | Full signup, error paths and mobile viewport |
| Accessibility | `@axe-core/playwright`, keyboard navigation, VoiceOver/NVDA | Automation catches only part of the issues; manual testing covers the rest |
| Performance | Lighthouse / Lighthouse CI, PageSpeed Insights, `web-vitals` library | Lab data plus real-user metrics |
| Debugging | Chrome DevTools (Network, Performance, throttling), React DevTools, PostHog toolbar or GA4 DebugView | Inspect async behavior and performance, and verify events |
| CI/CD | GitHub Actions + Vercel/Netlify with per-PR previews | Automated quality checks and simple deployment |
| Observability (proposal) | Sentry and structured logs | Signup errors visible in production |
| Documentation | Markdown in `/docs`, Mermaid diagrams | Renders directly on GitHub |
| Docs linting | `markdownlint-cli2` (table column count, headings, links) in `pnpm lint` | Prettier aligns a broken table row and still passes; only a linter that counts columns catches it |
| MCP (candidates) | Playwright MCP or Chrome DevTools MCP for a QA agent; PostHog MCP for an analytics agent; GitHub MCP | Use them only if they add real value; otherwise document. Check their current availability first |

## 7. Risks and questions

**Ambiguities:**

- The brand kit arrived without the `tokens/` and `source/` files its README lists.
- It doesn't say when the 72 hours start.
- The expected use of "update user" isn't defined, nor whether signup should require a password.

**Challenges:**

- 6 hours for many fronts.
- Making the AI system real, not decorative.
- Balancing the existing brand with "evolving" it.

**Common mistakes:**

- **Overbuilding.**
- **Analytics issues:**
  - adding it at the end;
  - documenting events the code never fires;
  - counting conversion on the click or before the server responds;
  - sending email or other PII as event properties;
  - reading event properties from the DOM (`data-*` attributes) without validating them, so a typo makes the server reject the event and it disappears without an error;
  - production smoke tests that create real users and fire the conversion event into the same funnel the experiment reads;
  - defining the primary metric in one document and rewording it in another, so the two definitions drift.
- **API issues:**
  - unprotected `GET /users` and `PATCH` (use an admin token or document the risk);
  - persistence that's lost on serverless;
  - not handling duplicates, double submits or timeouts.
- **Accessibility issues:** errors shown by color alone, no `aria-live`, no focus management or labels.
- **Performance issues:** render-blocking third-party scripts, hero image without dimensions (CLS), unoptimized fonts.
- **Copy:** promises of financial performance. This is a trading product; my inference is to frame it as practice and backtesting, not guaranteed profits.
- **Environment issues:**
  - local checks that behave differently from CI because CI sets an env var the README doesn't mention (e.g. a `noindex`-by-default build failing the Lighthouse SEO check locally while CI passes);
  - running on a Node version other than the one in `.nvmrc`;
  - test servers (Playwright `webServer`, Lighthouse CI `startServerCommand`) that spawn `pnpm` on a machine where only `corepack pnpm` works.
- **Docs issues:** a bare `|` inside a table cell (even inside backticks) splits the row on GitHub; numbers and paths in docs that nobody re-checked against the code.
- **Process:** unreviewed AI-generated docs, committed secrets, a README never tested on a clean clone from the remote, two AI sessions working in the same checkout (one commits onto the other's branch; use a separate worktree per session).

**Owner decisions (confirmed Oct 23, 2026):**

1. **Palette and typography:** the brand kit is in `brand/` (`brand-kit.html`, `logos/`). Its README lists `tokens/` and `source/` PDFs that weren't delivered; Stage 0 generates the tokens from `brand-kit.html` and cross-checks them against fxreplay.com.
2. **Deployment:** live, on Vercel, with Neon Postgres for the database and PostHog for analytics.
3. **Repository:** public.
4. **Submission:** sent by email.
5. **FX Replay's logos and assets:** may be used.
6. **Documents:** Markdown in the repo.
7. **Time spent:** reported from the repo (`docs/ai-log.md` and the git history).

## 8. Submission checklist

- [ ] The landing has a value proposition, CTA, responsive layout (mobile, tablet, desktop) and accessibility.
- [ ] Signup has validation, error, loading, success and double-submit protection, and calls the real API.
- [ ] The API supports create, update and list, with consistent errors and passing tests.
- [ ] Persistence works locally and deployed, and is documented.
- [ ] The taxonomy's events fire in the code (verified in debug), conversion is server-confirmed and there's no PII.
- [ ] The funnel and primary metric are defined once, and every other document links to that definition.
- [ ] Smoke and test traffic is tagged and excluded from the funnel; anything the final checks wrote to production is listed.
- [ ] The experiment has a hypothesis, control, variant, metric, guardrails and decision criteria.
- [ ] Lighthouse and axe were reviewed; metadata, OG, JSON-LD and semantic HTML are in place.
- [ ] `CLAUDE.md`, agents, skill/command and MCP (or its proposal) are committed.
- [ ] AI\_WORKFLOW includes concrete examples of improvements and of corrections or rejections.
- [ ] Architecture, analytics, experiment and performance docs exist, covering every bullet on p. 7–8.
- [ ] Assumptions and unimplemented items are documented, with next steps.
- [ ] The README works on a clean clone from the remote, on the Node version in `.nvmrc`, and every local check passes exactly as the README writes it.
- [ ] Every Markdown table renders with the right number of columns on GitHub (markdownlint passes).
- [ ] No secrets in the repo; a `.env.example` exists.
- [ ] CI is green.
- [ ] The live URL works and is accessible to them.
- [ ] The repo is accessible to the reviewers.
- [ ] Submitted within 72 hours.
- [ ] A 10–15 min demo script is ready, and you've prepared how you'd adapt the design to a new requirement.
