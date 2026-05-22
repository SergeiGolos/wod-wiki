import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for production smoketests
 * Targets the live production site at https://wod.wiki
 *
 * Run with: bun x playwright test --config playwright.smoke.config.ts
 */
export default defineConfig({
  testDir: './e2e/smoke',
  testMatch: '**/*.smoke.e2e.ts',

  timeout: 30 * 1000,
  fullyParallel: false, // Run serially for production safety
  forbidOnly: !!process.env.CI,
  retries: 1, // One retry for flaky network issues
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/smoke' }]],

  use: {
    baseURL: 'https://wod.wiki',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Production has valid HTTPS
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - production is already running
  webServer: undefined,
});
