# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-24

Drafted with the vendored `product-marketing` skill from FX Replay's public site, read on 2026-10-24 with the
Playwright MCP. Every fact cites its page. Quotes are short and verbatim; everything else is paraphrased. Facts
not found on the site are listed under [Open questions](#open-questions) instead of being guessed. The
vendored skills read this file through the `.agents/product-marketing.md` symlink.

Sources: [home](https://fxreplay.com/) (H), [pricing](https://fxreplay.com/pricing) (P),
[signup](https://app.fxreplay.com/en-US/signup) (S).

## Product Overview

**One-liner:** A browser-based backtesting and trading practice platform that replays real historical price
data (H, FAQ).
**What it does:** Traders replay past markets candle by candle, test a strategy, practise execution and review
every trade without risking real money (H, FAQ and meta description). It combines market replay, a trading
journal, AI trade analysis, a prop firm simulator and custom indicators in one product (H, FAQ).
**Product category:** Backtesting software; the page title says "Futures, Forex & Crypto Backtesting Platform" (H).
**Product type:** Subscription SaaS (H, footer disclosure).
**Business model:** Free plan with no credit card, no trial period and no expiry; paid Intermediate and Pro plans
(P). This project only promotes the free plan (ASSUMPTIONS A-003).

## Target Audience

**Target users:** Individual manual traders (H, FAQ: "built specifically for manual traders"), including traders
preparing for prop firm challenges (H, Prop Firm Simulator). B2C, so the B2B persona section is skipped.
**Primary use case:** Testing a manual strategy on real historical data before trading it live (H).
**Jobs to be done:**

- Find out whether a strategy works before risking money on it (H, "Test it before you trust it").
- Build a reviewable record of decisions and outcomes (H, FXR Journal).
- Rehearse a prop firm challenge under its rules (H, Prop Firm Simulator).

**Use cases:** Replaying a chosen date in Replay mode; multi-chart review with an economic calendar; drawdown
tracking under challenge rules (H).

## Problems & Pain Points

**Core problem:** Traders go live on a strategy they have not tested; the site contrasts "a gut feeling" with
replaying real data (H).
**Why alternatives fall short (as FX Replay states it):** other tools are either automated code-based testers or
replay tools with no analysis layer (H, FAQ).
**What it costs them:** Inference: real money when an untested strategy goes live. Screen time: the FAQ says replay compresses "years of screen time into
hours" (H, FAQ).
**Emotional tension:** Lack of confidence; the hero ties confidence to backtesting (H).

## Competitive Landscape

Not named on the site. The FAQ describes two categories only: automated code-based strategy testers and
replay tools without analysis (H). See Q-PC1.

## Differentiation

**Key differentiators (H, FAQ):**

- Built for manual traders; no coding required (FXR Script is optional).
- Replay, journal, AI analysis, prop firm simulator and custom indicators in one subscription.
- Real historical data: "120+ assets across 6 markets" on the home page; the FAQ lists Futures, Forex,
  Indices, Metals, Energy, Stocks, Crypto and Agricultural markets (H). Data history and seconds-level replay
  depend on the plan (P).

**Why customers choose it:** Not stated beyond the FAQ. See Q-PC2.

## Objections

The site's FAQ is its own objection handling (H, P):

| Objection | Response on the site |
| --- | --- |
| "Is it really free, or a trial?" | Free plan, no card, no trial period, no automatic upgrade (P) |
| "Do I need to code?" | No; FXR Script is optional (H) |
| "How is it different from other backtesting tools?" | Manual-execution focus and an all-in-one product (H) |
| "How quickly will it help?" | Depends on session volume, not calendar time (H) |

**Anti-persona:** Not stated. Inference: traders who only want fully automated, code-based strategy testing,
since the site positions against that category (H, FAQ). Marked as an inference.

## Switching Dynamics

**Push:** Untested strategies and gut-feel decisions (H).
**Pull:** Free start with no card; real historical data; everything in one place (H, P).
**Habit:** Not stated. See Q-PC3.
**Anxiety:** Inference: whether practice on past data transfers to live trading; the site itself warns that simulated
results have limits (H, CFTC Rule 4.41 disclosure).

## Customer Language

**How they describe the product:** the site has testimonials, but they are excluded from this file so that
drafting skills can't reuse them (A-003). Customer verbatims are an open question (Q-PC2).

**Words to use:** backtest, replay, practice, test your edge, real historical data, journal, sample (H).
**Words to avoid:** profit, profitable, guaranteed, win rate, returns, "become a better trader" as a promise.
Reason: CLAUDE.md rule 5 and the site's own risk disclosure (H).
**Glossary:**

| Term | Meaning |
| --- | --- |
| Replay mode | Jump to a date and watch price unfold as it happened (H) |
| FXR Journal | Entries, exits, notes, tags and outcomes tied to each session (H) |
| Prop Firm Simulator | Run a strategy under challenge rules and track drawdown (H) |
| FXR Script | Optional scripting language for custom indicators (H, FAQ) |

## Brand Voice

| Attribute | Means | Doesn't mean | Example line |
| --- | --- | --- | --- |
| Evidence first | Claims rest on testing and records | Statistics or results we can't show | "Test your edge across a larger sample" (H) |
| Direct | Short imperative lines | Hype or exclamation marks | "Test it before you trust it." (H) |
| Disciplined | Process, reps, consistency | Shortcuts or overnight change | "Build trust in your strategy, one rep at a time" (H) |

**Tone by context:** errors and support are calm and specific; the site's help copy points to the Help Center
and Discord (H). Launch, sales and social tone: not observed. See Q-PC4.
**Terms we own:** FXR Journal, FXR Script, Replay mode (H).
**Never use (and why):** performance or profit promises (CLAUDE.md rule 5; CFTC disclosure on H).

## Proof Points

**Metrics:** "Over 1 million traders have used it" (H, FAQ); the meta description says "Trusted by 1M+ traders"
(H). "120+ assets across 6 markets" on the home page (H).
**Customers:** Individual traders; no logos on the site.
**Testimonials:** Present on the site but not used here (A-003).
**Value themes:**

| Theme | Proof |
| --- | --- |
| Test before going live | Replay on real historical data (H) |
| Free to start | Free plan without card or trial period (P) |
| All in one | Replay, journal, AI analysis, prop simulator, indicators (H, FAQ) |

## Goals

**Business goal:** Raise the conversion rate from marketing traffic to account creation (challenge brief).
**Conversion action:** Create a free account; on the real site, CTAs link to the app's signup page with an
`aff` parameter per placement (H). The real signup asks for an email or Google sign-in only (S).
**Current metrics:** Not public. See ASSUMPTIONS A-006.

## StoryBrand BrandScript

Built only from the facts above.

| Element | Content |
| --- | --- |
| Character | A manual trader who wants to trade a strategy with confidence |
| Problem (external) | The strategy is untested on real market data |
| Problem (internal) | Doubt: decisions feel like a gut call |
| Problem (philosophical) | A strategy should be tested before it is trusted |
| Guide (empathy) | FX Replay is built for manual traders practising execution (H) |
| Guide (authority) | Over 1 million traders have used it; real historical data on 120+ assets across 6 markets (H) |
| Plan | 1. Create a free account, no card needed (P). 2. Replay a strategy on real historical data (H). 3. Review every trade (H, "review every trade") |
| Call to action (direct) | Try FX Replay Free |
| Call to action (transitional) | See what the free plan includes (P) |
| Avoid failure | Going live with an untested strategy and no record of what you did |
| Success | A strategy tested across a larger sample, with a record to review before going live (H, "Test your edge across a larger sample") |

Success is framed as evidence and process, never as profit.

## Learnings

*Decisions and tested lessons. Newest first.*

| Date | Learning | Evidence | Applies to | Status |
| --- | --- | --- | --- | --- |
| 2026-10-24 | Promote only the free plan and never cite performance | CLAUDE.md rule 5; site risk disclosure (H) | copywriting, cro, signup | active |

## Open questions

These go to FX Replay; until answered, copy doesn't rely on them.

- **Q-PC1:** Which competitors do you position against by name?
- **Q-PC2:** Why do traders say they chose FX Replay (research, reviews, survey verbatims)?
- **Q-PC3:** What do traders use before FX Replay (spreadsheets, TradingView bar replay, paper trading)?
- **Q-PC4:** Is there a voice guide for launches, sales and social?

## Changelog

*Newest first.*

- v1 (2026-10-24) — Initial context drafted from fxreplay.com, pricing and signup pages; brand-copy-reviewer
  findings applied before the first commit to main.
