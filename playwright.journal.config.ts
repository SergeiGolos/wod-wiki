import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for journal / playground e2e tests.
 * Targets the Vite playground dev server (HTTPS on Tailscale domain).
 * Run with:  bun run test:e2e:journal
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/journal-scroll.e2e.ts', '**/journal-entry.e2e.ts'],

  timeout: 45 * 1000,
  fullyParallel: false, // scroll tests are sensitive to ordering; run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'https://pluto.forest-adhara.ts.net:5173',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'journal-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'bun run dev:app',
    url: 'https://pluto.forest-adhara.ts.net:5173',
    reuseExistingServer: true, // always reuse; playground is long-running
    timeout: 60 * 1000,
    ignoreHTTPSErrors: true,
  },
});
