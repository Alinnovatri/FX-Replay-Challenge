import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;
// A fresh, migrated PGlite folder per run so the signup flow has real tables behind it.
const DB = '.pglite-e2e';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // localhost is a secure context, so the Secure __Host- cookie works over http in tests.
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Runs the production build. `node` is used directly so this works where only `corepack pnpm` exists.
  webServer: {
    command: `rm -rf ${DB} && node scripts/migrate.mjs && node node_modules/next/dist/bin/next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    // Test-only secrets, never used outside this local server.
    env: { DB_DRIVER: 'pglite', PGLITE_DIR: DB, ADMIN_TOKEN: 'e2e-admin-token', SESSION_SECRET: 'e2e-session-secret' },
  },
});
