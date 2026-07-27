import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { storybookBaseURL } from './e2e/utils/url-helpers';

loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

// Local dev Storybook by default; deployed Storybook in CI; E2E_STORYBOOK_URL
// overrides both (see e2e/utils/url-helpers.ts).
const storybookBase = storybookBaseURL();

/**
 * Playwright configuration for E2E testing of Storybook components
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // live-app tests target the running playground app, not Storybook.
  // They are executed separately via playwright.journal.config.ts or
  // playwright.repro.config.ts with the correct baseURL.
  testIgnore: [
    '**/live-app/**',
    // Smoke specs run via playwright.smoke.config.ts against their own targets.
    '**/smoke/**',
  ],

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
    baseURL: storybookBase,

    /* Local Storybook uses self-signed/Tailscale certs; deployed targets have valid ones */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on every test — embedded in the HTML report */
    screenshot: 'on',

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

  /* Run local Storybook before the tests — skipped in CI or when
     E2E_STORYBOOK_URL points at an external Storybook */
  webServer: (process.env.CI || process.env.E2E_STORYBOOK_URL)
    ? undefined
    : {
        command: 'bun run storybook',
        url: storybookBase,
        ignoreHTTPSErrors: true,
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
