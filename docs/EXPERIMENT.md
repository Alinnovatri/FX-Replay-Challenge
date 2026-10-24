# Experiment: quiz-first vs email-first signup

Designed in Stage 6 from the owner's hypothesis (ADR-011). Assignment and both arms are implemented and live;
this document defines how the result is read and decided.

## Hypothesis

Asking two quick, low-risk questions before the email (experience level, then markets), with a visible
progress bar, raises signup conversion, because answering the first questions is a small commitment that makes
finishing more likely and the questions signal a tailored product. Risk: every extra step before the email can
lose visitors, which is why FX Replay's own signup and the `signup` skill both start with the email. There is
no data either way, so it is tested.

## Arms

| | Control | Variant |
| --- | --- | --- |
| Name | `control` | `quiz` |
| Signup | Optional first name, email and "Try FX Replay Free" in the hero | Step 1 experience level, step 2 markets (optional), step 3 optional first name and email, with "Step n of 3" and a progress bar |
| After signup | Optional profile step (level, markets) | Nothing (level and markets already saved) |
| Everything else | Identical landing page | Identical landing page |

**Assignment:** `src/proxy.ts`, server-side, 50/50 per visitor on the first visit to `/`, kept in the
`__Host-fxr_variant` cookie for 90 days (`?fxr_variant=` overrides it on previews and locally only; `/variants/quiz` and `/variants/control` pin
the arm for QA, in production too). The quiz is served at `/` through a rewrite: same URL, no client flash, no
layout shift. Every event carries `variant`.

## Metrics

- **Primary:** signup conversion rate, as defined once in
  [ANALYTICS.md](ANALYTICS.md#primary-metric), compared between `variant` values.
- **Guardrails:**
  - `signup_failed` per `signup_submitted`, by `error_code`: the variant must not raise errors.
  - Time from `landing_viewed` to `user_signed_up` (median): a large increase is a usability warning even if
    conversion holds.
  - Core Web Vitals (Lighthouse CI on both pages, field data later): the variant must stay within the budgets.
  - `profile_completed` per `user_signed_up`: control only, because the quiz arm has no step after signup.
- **Diagnostic (variant):** drop-off between `signup_started`, `quiz_step_completed` 1 and 2, and
  `signup_submitted`.

## Sample size

Two-sided test of two proportions, α = 0.05, power 0.8. There is no public baseline (ASSUMPTIONS A-006), so the
plan assumes 5 % landing-to-signup and a minimum detectable effect of +20 % relative (5 % to 6 %):

| Baseline | Relative MDE | Visitors per arm | Total |
| --- | --- | --- | --- |
| 5 % (planning value) | +20 % | 8,155 | 16,310 |
| 5 % | +10 % | 31,231 | 62,462 |
| 3 % | +20 % | 13,911 | 27,822 |
| 8 % | +20 % | 4,917 | 9,834 |

Computed with `n = (z₀.₉₇₅ + z₀.₈)² · (p₁q₁ + p₂q₂) / (p₂ − p₁)²` (Python's `statistics.NormalDist`; the command
is in `docs/ai-log.md`). After the first full week, recompute with the measured baseline and replace the
planning value. **Duration:** at least 14 days (two full weekly cycles) and until each arm reaches the sample,
whichever is later. No peeking-based stops: the result is read once, at the planned sample.

## Decision rules

Read at the planned sample, on `is_test = false` traffic only, after checking that the arms are balanced
(sample ratio mismatch: a χ² test with p < 0.01 on assignment counts invalidates the run until fixed).

- **Ship the variant** if the primary metric is higher with a 95 % confidence interval for the difference
  entirely above 0, and no guardrail is significantly worse (error rate, median time to signup up by more than
  25 %, any Web Vital out of budget).
- **Reject the variant** if the confidence interval is entirely below 0, or any guardrail is significantly worse.
- **Continue** if the interval includes 0 and the run is shorter than 4 weeks: extend once to the sample for a
  +10 % MDE if traffic allows. If it still includes 0 after that, keep the control (simpler, matches FX Replay's
  own flow) and record the result as "no detectable difference".

## Operating notes

- PostHog: an insight "Signup funnel by variant" built from the funnel in ANALYTICS, `is_test = false`,
  breakdown `variant`.
- A change to either arm during the run restarts the count.
- The experiment flag is the `__Host-fxr_variant` cookie; to end the test, change `assignVariant` to return the winner
  and keep the losing component until the next cleanup.
