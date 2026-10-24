#!/usr/bin/env node
// Verifies the public and cookie paths of the Users API against a deployment, without any secret.
//   BASE_URL=https://fx-replay-challenge.vercel.app node scripts/verify-api.mjs
// It WRITES one test user per run, smoke+<timestamp>@example.test (reserved test domain), so it is not part of
// the read-only smoke test. Every test user it creates is listed in docs/ai-log.md; Stage 6 tags this traffic
// and excludes it from the funnel.
const base = process.env.BASE_URL;
if (!base) {
  console.error('verify-api: BASE_URL is required');
  process.exit(1);
}

const email = `smoke+${Date.now()}@example.test`;
const call = (path, init = {}) =>
  fetch(new URL(path, base), {
    ...init,
    // Tagged as test traffic (docs/ANALYTICS.md); the emails also use the reserved example.test domain.
    headers: { 'x-fxr-test': '1', ...init.headers },
    signal: AbortSignal.timeout(10_000),
  }).then(async (res) => ({
    res,
    body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text(),
  }));
const jsonInit = (method, body, headers = {}) => ({
  method,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const key = crypto.randomUUID();
const created = await call('/users', jsonInit('POST', { email }, { 'idempotency-key': key }));
const setCookie = created.res.headers.get('set-cookie') ?? '';
const cookie = setCookie.split(';')[0];
const id = created.body?.user?.id;
check('POST /users -> 201 with user', created.res.status === 201 && typeof id === 'string', created.res.status);
check(
  'profile cookie attributes',
  ['__Host-fxr_profile=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=1800'].every((a) =>
    setCookie.includes(a),
  ),
  setCookie.replace(/=[^;]+/, '=<redacted>'),
);

const replay = await call('/users', jsonInit('POST', { email }, { 'idempotency-key': key }));
check(
  'idempotent replay -> 201 same id',
  replay.res.status === 201 && replay.body?.user?.id === id && replay.res.headers.get('idempotent-replayed') === 'true',
  replay.res.status,
);

const dup = await call('/users', jsonInit('POST', { email: email.toUpperCase() }));
check(
  'duplicate email -> 409 EMAIL_TAKEN',
  dup.res.status === 409 && dup.body?.error?.code === 'EMAIL_TAKEN',
  dup.res.status,
);

const conflict = await call('/users', jsonInit('POST', { email: `other-${email}` }, { 'idempotency-key': key }));
check(
  'key reused with another body -> 409 IDEMPOTENCY_CONFLICT',
  conflict.res.status === 409 && conflict.body?.error?.code === 'IDEMPOTENCY_CONFLICT',
  conflict.res.status,
);

const invalid = await call('/users', jsonInit('POST', { email: 'nope' }));
check(
  'invalid email -> 400 with fields.email',
  invalid.res.status === 400 && typeof invalid.body?.error?.fields?.email === 'string',
  invalid.res.status,
);

const profile = await call(
  `/users/${id}`,
  jsonInit('PATCH', { firstName: 'Smoke', experienceLevel: 'beginner', markets: ['forex'] }, { cookie }),
);
check(
  'PATCH with cookie -> 200 profile saved',
  profile.res.status === 200 && profile.body?.user?.firstName === 'Smoke',
  profile.res.status,
);

const emailChange = await call(`/users/${id}`, jsonInit('PATCH', { email: `x-${email}` }, { cookie }));
check('PATCH email with cookie -> 403', emailChange.res.status === 403, emailChange.res.status);

const noCookie = await call(`/users/${id}`, jsonInit('PATCH', { firstName: 'X' }));
check('PATCH without credentials -> 401', noCookie.res.status === 401, noCookie.res.status);

const otherId = await call(`/users/${crypto.randomUUID()}`, jsonInit('PATCH', { firstName: 'X' }, { cookie }));
check('PATCH another id with cookie -> 403', otherId.res.status === 403, otherId.res.status);

const list = await call('/users');
check('GET /users without token -> 401', list.res.status === 401, list.res.status);

const requestId = created.res.headers.get('x-request-id');
check('x-request-id present', Boolean(requestId), requestId ? 'present' : 'missing');

for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name} (${r.detail})`);
console.log(`test user: id=${id}, domain=example.test`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
