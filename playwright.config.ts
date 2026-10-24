import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Runs the production build. `node` is used directly so this works where only `corepack pnpm` exists.
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { DB_DRIVER: 'pglite', PGLITE_DIR: 'memory://' },
  },
});
