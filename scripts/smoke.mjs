#!/usr/bin/env node
// Smoke test against a deployed URL: BASE_URL=https://... pnpm smoke
// Read-only: it creates no users and fires no analytics events.
const base = process.env.BASE_URL;
if (!base) {
  console.error('smoke: BASE_URL is required, e.g. BASE_URL=https://fx-replay-challenge.vercel.app pnpm smoke');
  process.exit(1);
}

const checks = [
  async () => {
    const res = await fetch(new URL('/', base), { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    const html = await res.text();
    if (res.status !== 200) throw new Error(`GET / returned ${res.status}`);
    if (!html.includes('Try FX Replay Free')) throw new Error('GET / does not contain the primary CTA');
    return `GET / 200 (${Buffer.byteLength(html)} bytes)`;
  },
  async () => {
    const res = await fetch(new URL('/api/health', base), { signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    if (res.status !== 200 || body.db !== 'ok')
      throw new Error(`GET /api/health returned ${res.status} ${JSON.stringify(body)}`);
    return 'GET /api/health 200 db=ok';
  },
];

let failed = 0;
for (const check of checks) {
  try {
    console.log(`ok   ${await check()}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
