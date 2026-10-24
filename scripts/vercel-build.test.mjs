// Run with: node --test scripts/vercel-build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { planBuild } from './vercel-build.mjs';

test('a production build migrates', () => {
  assert.deepEqual(planBuild({ VERCEL: '1', VERCEL_ENV: 'production', DATABASE_URL: 'x' }), { migrate: true });
});

test('a production build without DATABASE_URL fails', () => {
  assert.throws(() => planBuild({ VERCEL: '1', VERCEL_ENV: 'production' }), /DATABASE_URL is missing/);
});

test('preview and development builds never migrate', () => {
  for (const VERCEL_ENV of ['preview', 'development', undefined]) {
    assert.deepEqual(planBuild({ VERCEL: '1', VERCEL_ENV, DATABASE_URL: 'x' }), { migrate: false });
  }
});

test('the build refuses to run off Vercel', () => {
  assert.throws(() => planBuild({ VERCEL_ENV: 'production', DATABASE_URL: 'x' }), /only on Vercel/);
});

test('migrate.mjs refuses Neon outside a Vercel production build', () => {
  const env = { PATH: process.env.PATH, DB_DRIVER: 'neon', DATABASE_URL: 'postgres://never-used.invalid/db' };
  const offVercel = spawnSync(process.execPath, ['scripts/migrate.mjs'], { env, encoding: 'utf8' });
  assert.equal(offVercel.status, 1);
  assert.match(offVercel.stderr, /only in a Vercel production build/);
  const preview = spawnSync(process.execPath, ['scripts/migrate.mjs'], {
    env: { ...env, VERCEL: '1', VERCEL_ENV: 'preview' },
    encoding: 'utf8',
  });
  assert.equal(preview.status, 1);
  assert.doesNotMatch(preview.stderr, /never-used/);
});
