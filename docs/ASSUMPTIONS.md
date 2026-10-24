# Assumptions

Each assumption has a status: **open** (unconfirmed, could change the work), **accepted** (owner agreed),
or **closed** (confirmed or replaced). Facts about FX Replay cite a source URL and the date it was read.

## A-001

**Status:** open.
`brand/README.md` lists `tokens/tokens.css`, `tokens/tokens.json`, `source/Color Tokens.pdf` and
`source/Typography.pdf`, but none were delivered. Tokens are generated from `brand/brand-kit.html` by
`scripts/brand/generate-tokens.mjs` into `brand/generated/`. If the official files arrive, they replace the
generated ones in a single PR. The kit enforces no type scale, so Stage 5 defines one.

## A-002

**Status:** open.
`btn-bg-primary-disabled` points at `blue-950`, which the primitive scale doesn't define (the brand README
lists this as an open question for design). The kit's own script patches it to `#000000`; the generator
keeps that value and marks it `unconfirmed`. A black fill on the near-black page would not read as a
button, so the UI does not use a disabled primary button (submitting shows a busy state instead).

## A-003

**Status:** accepted (owner, 2026-10-24: use the public site).
Facts we may use in copy, all read on 2026-10-24:

| Fact | Source |
| --- | --- |
| Browser-based backtesting and trading practice platform; replays real historical price data | [fxreplay.com FAQ](https://fxreplay.com/) |
| Free plan: no credit card, no trial period, no automatic conversion to paid, core backtesting features | [Pricing FAQ](https://fxreplay.com/pricing) |
| Free plan includes 2 backtesting sessions, 1 indicator, 1 week data retention | [Pricing](https://fxreplay.com/pricing) |
| "120+ assets across 6 markets with real historical data" (home); the FAQ lists Futures, Forex, Indices, Metals, Energy, Stocks, Crypto and Agricultural markets | [fxreplay.com](https://fxreplay.com/) |
| Features: Replay mode, trading journal, prop firm simulator, custom indicators, economic calendar, AI analysis | [fxreplay.com](https://fxreplay.com/) |
| No coding needed; built for manual traders practising execution | [fxreplay.com FAQ](https://fxreplay.com/) |
| "Over 1 million traders have used it" | [fxreplay.com FAQ](https://fxreplay.com/) |
| Not a broker; educational and backtesting platform only | [fxreplay.com footer disclosure](https://fxreplay.com/) |

Not used: testimonials and their names (the site itself warns they "may not reflect typical results"),
paid-plan prices, and the pricing headline about profitable trading (against our no-performance-promise
rule). Copy that cites "1 million traders" quotes the site's wording and is reviewed by brand-copy-reviewer.
The risk and CFTC Rule 4.41 disclosures from the footer are linked, not copied.

## A-004

**Status:** open.
After signup, our success state confirms the account and offers the optional profile step. We don't
redirect to `app.fxreplay.com`: our users don't exist there, so a redirect would promise access we can't
give. Account access is a documented next step (owner decision 9).

## A-005

**Status:** open.
Signup shows the same notice FX Replay's own signup uses, linking to their Privacy Policy and Terms. We
don't send marketing email, so there is no marketing-consent checkbox. The PostHog project has
`anonymize_ips` off; Stage 6 turns it on, and analytics carry no PII (CLAUDE.md rule 7). A cookie banner is
not added because we set no non-essential cookies before consent: the analytics identifier is first-party
and its handling is decided in Stage 6 (ADR-003).

## A-006

**Status:** open.
Baseline conversion and traffic are not public. Stage 6 assumes a baseline landing-to-signup rate and
weekly traffic, states them next to the sample-size calculation, and shows how duration changes if they
are off.

## A-007

**Status:** accepted.
The kit loads JetBrains Mono only for its own swatch labels; it is not a brand font and is not generated.

## A-008

**Status:** open.
Cross-check of the generated tokens against the computed styles of [fxreplay.com](https://fxreplay.com/),
read on 2026-10-24 with the Playwright MCP at its default desktop viewport. OKLCH values were converted to
sRGB hex. Matches: Lato for headings, Nunito Sans for body, `h2` text `#F6F6F6` (`neutral-50`), the nav
"Try for free" button fill `#0260FD` (`blue-600`), and the hero CTA text `#030303` (`dark-900`).

| Element | Site (computed) | Generated token | Mismatch |
| --- | --- | --- | --- |
| Page background | `#000000` | `bg-primary` = `dark-900` `#030303` | Site uses pure black (`dark-950`) |
| Body text | `#FFFFFF` | `text-primary` = `neutral-50` `#F6F6F6` | Site uses pure white, not in the kit |
| Paragraph text | `#E9E9E9` | `text-secondary` = `neutral-200` `#D1D1D1` | Not a kit value (nearest `neutral-100` `#E7E7E7`) |
| Hero CTA "Get started for free" | White fill, `#030303` text, pill radius | `btn-bg-primary-active` = `blue-600` | Site's primary hero button is white, not blue |
| Default border | `#1F1F1F` | `border-primary` = `dark-700` `#1A1A1A` | Not a kit value |
| Feature card border | `#173D85` | `border-brand` = `blue-600` | Not a kit value (nearest `blue-800` `#01307F`) |
| Button font weight | Lato 400 at 14 px | No type scale in the kit | Recorded for Stage 5 |
| Hero `h1` | Lato 700 at 54 px | No type scale in the kit | Size depends on viewport; recorded for Stage 5 |

The site has drifted from the kit in small ways. The project follows the kit (the delivered source), adjusted
only by ADR-005 for contrast. Stage 5 may adopt the white primary CTA if the brand review agrees; that would be
a decision recorded in DECISIONS, not a token edit.

## A-009

**Status:** accepted.
Amended 2026-10-24 by the owner, replacing the earlier "72 hours from the first commit".

- **72-hour window:** the challenge was received on 2026-10-22 at 09:19. The timezone is assumed to be the
  owner's, UTC-6. Submission deadline: **2026-10-25 09:19 (UTC-6)**.
- **6-hour work budget:** counted from the first commit, `8888643` at 2026-10-23 23:27:55 (UTC-6).
  The clock runs continuously, pauses included, so the budget ends at 2026-10-24 05:27:55 (UTC-6).

## A-010

**Status:** open (refined in Stage 4 with the signup skill).
The optional profile step asks for a first name, an experience level (beginner, intermediate, advanced) and the
markets the trader practises. The market list is the subset of FX Replay's markets in A-003 that a beginner
would recognise (forex, futures, stocks, crypto, indices, metals); energy and agricultural markets are left out to
keep the step short. These fields are our choice for a meaningful `PATCH`, not FX Replay's onboarding.
