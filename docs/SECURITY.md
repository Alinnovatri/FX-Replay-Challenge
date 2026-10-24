# Security

What protects the app today, what was reviewed, and what is not done. Every item below points at code or a
measurement; nothing is aspirational unless it is under "Not done".

## In place

- **Secrets:** none in the repo (gitleaks scans the full history on every PR). `DATABASE_URL` comes from the
  Neon integration; `ADMIN_TOKEN`, `SESSION_SECRET` and `POSTHOG_PROJECT_KEY` were created by the owner in the
  Vercel dashboard. The owner's admin check ran in their own terminal with `read -rs`; no secret entered the
  Claude Code session. A PreToolUse hook (`.claude/hooks/env-guard.mjs`) blocks the agent from reading `.env*`
  files (best-effort, ADR-007).
- **Admin access:** `GET /users` and admin `PATCH` require `Authorization: Bearer <ADMIN_TOKEN>`, compared in
  constant time over SHA-256 digests (`src/server/auth.ts`). The token never reaches client code.
- **Self-service cookie:** `__Host-fxr_profile`, HMAC-SHA256 over `{uid, exp}`, HttpOnly, Secure,
  SameSite=Strict, 30 minutes, bound to one user, profile fields only, never email. Tampered, expired and
  malformed tokens are a 401 (unit tests).
- **Idempotency replays** re-issue the cookie only within 30 minutes, so a leaked key is not a long-lived
  credential (security review finding, fixed).
- **Input:** strict Zod schemas before any database call; 10 KB body cap read as a stream; parameterised SQL
  only; keyset cursors validated before reaching Postgres.
- **Errors and logs:** generic 500s; logs carry error class, SQLSTATE, request id and the missing setting name,
  never messages, SQL or personal data (unit tests assert no email in logs).
- **Analytics:** a closed event contract; same-origin relay (a foreign `Origin` is a 403); no PII in events
  (verified in PostHog: 0 of 5 events contained an `@`); query overrides that could tag or reassign visitors
  work outside production only.
- **Database:** migrations reach production only through migrate-on-deploy; `drizzle-kit push` and the Neon
  migrator are refused elsewhere.
- **Transport:** Vercel serves HSTS (`max-age=63072000; includeSubDomains; preload`, measured on production).
- **Supply chain:** exact dependency versions, pinned pnpm (sha512), Actions pinned to SHAs, CodeQL,
  `pnpm audit --prod` (0 known vulnerabilities after moving off `next@16.4.0`), Dependabot with a cooldown.
- **Agent permissions:** Claude Code may not merge to `main`, push to it, change Vercel env vars, promote or roll
  back deployments; `main` requires a PR and five checks (ADR-006, ADR-007).

## Accepted risks

- **Account enumeration:** a duplicate email returns 409 `EMAIL_TAKEN`, as the brief requires. Mitigation would
  be rate limiting (not done).
- **Event spoofing:** the relay accepts any well-formed event with a UUID-shaped visitor id, so a script could
  inflate the funnel denominator and use PostHog quota. Same-origin checks stop browsers, not scripts.
- **Dev-only advisories** in Lighthouse CI and markdownlint dependencies (ADR-009); nothing ships to production.

## Not done (next steps)

- Rate limiting per IP and visitor on `POST /users` and `POST /api/e`.
- Security headers beyond Vercel's defaults: Content-Security-Policy, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` (measured: none set today).
- HMAC-signed visitor ids so forged ids are rejected.
- Bot protection on signup; email verification.
- A scoped PostHog personal key for the MCP (today it authenticates as a project admin and every call asks).
