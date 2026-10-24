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
| Not a broker; educational and backtesting platform only | Site footer disclosure |

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
`anonymize_ips` off; Stage 6 turns it on, and analytics carry no PII (working rule 9). A cookie banner is
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

**Status:** open (cross-check in Stage 1).
fxreplay.com, read on 2026-10-24, renders its primary CTA as a white button with `#030303` text, uses
Lato 700 for the hero `h1` at 37 px, and sets `body` to Nunito Sans on pure black. The kit's primary
button is `blue-600`. Stage 1 records every mismatch between generated tokens and computed styles here.

## A-009

**Status:** accepted.
Amended 2026-10-24 by the owner, replacing the earlier "72 hours from the first commit".

- **72-hour window:** the challenge was received on 2026-10-22 at 09:19. The timezone is assumed to be the
  owner's, UTC-6. Submission deadline: **2026-10-25 09:19 (UTC-6)**.
- **6-hour work budget:** counted from the first commit, `8888643` at 2026-10-23 23:27:55 (UTC-6).
  The clock runs continuously, pauses included, so the budget ends at 2026-10-24 05:27:55 (UTC-6).
