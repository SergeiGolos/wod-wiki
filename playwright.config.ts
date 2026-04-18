import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of Storybook components
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // live-app tests target the running playground app, not Storybook.
  // They are executed separately via playwright.journal.config.ts or
  // playwright.repro.config.ts with the correct baseURL.
  testIgnore: ['**/live-app/**'],

  /* Maximum time one test can run for */
  timeout: 30 * 1000,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }], ['github']]
    : 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for Storybook */
    baseURL: 'http://localhost:6006',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
