#!/usr/bin/env node
// Vercel build entry point. Migrations run on production builds only (migrate-on-deploy);
// preview and local builds never touch the database schema.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Decides what a build does from its environment. Throws on an environment it must not build in. */
export function planBuild(env) {
  if (!env.VERCEL) throw new Error('vercel-build: run this only on Vercel; use `pnpm build` locally');
  if (env.VERCEL_ENV === 'production') {
    if (!env.DATABASE_URL) throw new Error('vercel-build: DATABASE_URL is missing on a production build');
    return { migrate: true };
  }
  return { migrate: false };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
  const plan = planBuild(process.env);
  if (plan.migrate) run('node', ['scripts/migrate.mjs']);
  else console.log(`vercel-build: VERCEL_ENV=${process.env.VERCEL_ENV}; skipping migrations`);
  run('node', ['node_modules/next/dist/bin/next', 'build']);
}
