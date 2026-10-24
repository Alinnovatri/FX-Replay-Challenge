import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Same values in CI and locally: tests always use an in-memory PGlite.
    // Test-only values; production secrets live in Vercel and never in the repo.
    env: {
      DB_DRIVER: 'pglite',
      PGLITE_DIR: 'memory://',
      ADMIN_TOKEN: 'test-admin-token',
      SESSION_SECRET: 'test-session-secret',
    },
  },
});
