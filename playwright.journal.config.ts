import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for journal / playground e2e tests.
 * Targets a local Vite dev server on the default port.
 * Run with:  bun run test:e2e:journal
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/live-app/**/*.e2e.ts'],

  timeout: 45 * 1000,
  fullyParallel: false, // scroll tests are sensitive to ordering; run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
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
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
