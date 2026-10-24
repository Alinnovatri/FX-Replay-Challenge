# Questions for FX Replay

Owner decision (2026-10-24): we don't wait for answers. Each question is resolved from FX Replay's public
site, or by a stated inference, and the resolution is recorded here and in [ASSUMPTIONS.md](ASSUMPTIONS.md).
If FX Replay answers later, the answer replaces the resolution in a single PR.

Sources were read on 2026-10-24 with the built-in browser.

| # | Question | Resolution | Basis | Status |
| --- | --- | --- | --- | --- |
| Q1 | Can you send `brand/tokens/` and `brand/source/` (Color Tokens.pdf, Typography.pdf)? Is there a type scale? | Tokens are generated from `brand/brand-kit.html`. The kit says no type scale is enforced "by design", so we define our own in Stage 5 | `brand/README.md` footer; [A-001](ASSUMPTIONS.md#a-001) | Open |
| Q2 | `blue-950` is not in the primitive scale. What is its value? | Use the kit's own fallback `#000000`, flagged as unconfirmed in the generated tokens. The UI avoids the disabled primary button style, so the value has no visible effect | `brand-kit.html` script (`RESOLVE["blue-950"]`); [A-002](ASSUMPTIONS.md#a-002) | Open |
| Q3 | Is "Try FX Replay Free" a free plan or a trial? Does it need a card? Which facts can we use? | A free plan: "no credit card required, no trial period", core backtesting features, no expiry. Paid plans exist; we only mention the free plan. Approved facts are listed in [A-003](ASSUMPTIONS.md#a-003) | [Pricing FAQ](https://fxreplay.com/pricing), [home FAQ](https://fxreplay.com/) | Resolved (public site) |
| Q4 | Where should the user go after signup? | Our success state confirms the account and offers the optional profile step. Account access is out of scope (owner decision 9); the real product sends users to `app.fxreplay.com` | Home CTAs link to `https://app.fxreplay.com/en-US/signup?aff=homepage`; [A-004](ASSUMPTIONS.md#a-004) | Resolved (inference) |
| Q5 | Privacy and terms URLs? Is marketing consent or GDPR handling needed? | Link to FX Replay's [Privacy Policy](https://fxreplay.com/legal-regulatory/privacy-policy) and [Terms](https://fxreplay.com/legal-regulatory/terms-conditions) with the same notice their signup uses ("By submitting this form, I confirm..."). We send no marketing email, so we ask for no marketing consent. No PII goes to analytics | FX Replay signup page; [A-005](ASSUMPTIONS.md#a-005) | Resolved (inference) |
| Q6 | What are the baseline conversion rate and weekly traffic? | Not public. The experiment uses an assumed baseline and traffic, and the sample-size calculation shows how the duration changes if they differ | [A-006](ASSUMPTIONS.md#a-006) | Open |
| Q7 | Can we use `blue-400` for text and links on dark surfaces, since `blue-600` misses AA? | Yes, as a documented brand evolution (the brief invites evolving the visual direction). `blue-600` stays for fills, large text and borders | [CONTRAST.md](brand/CONTRAST.md); [ADR-005](DECISIONS.md#adr-005-brand-tokens-and-contrast-driven-deviations) | Resolved (our decision) |
