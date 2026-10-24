#!/usr/bin/env node
// Vercel build entry point. Migrations run on production builds only (migrate-on-deploy);
// preview and local builds never touch the production schema.
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

if (!process.env.VERCEL) throw new Error('vercel-build: run this only on Vercel; use `pnpm build` locally');
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL) throw new Error('vercel-build: DATABASE_URL is missing on a production build');
  run('node', ['scripts/migrate.mjs']);
} else {
  console.log(`vercel-build: VERCEL_ENV=${process.env.VERCEL_ENV}; skipping migrations`);
}
run('node', ['node_modules/next/dist/bin/next', 'build']);
