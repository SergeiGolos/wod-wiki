import { defineConfig, devices } from '@playwright/test';
import { appBaseURL, storybookBaseURL } from './e2e/utils/url-helpers';

/**
 * Playwright configuration for smoketests.
 *
 * Targets:
 *  - CI:  the deployed app (https://wod.wiki) and deployed Storybook
 *         (https://storybook.wod.wiki). No local servers are started.
 *  - Local: the Vite dev app and dev Storybook, started automatically
 *         (existing instances are reused).
 *  - E2E_APP_URL / E2E_STORYBOOK_URL override either target explicitly.
 *
 * Run with: bun x playwright test --config playwright.smoke.config.ts
 */
const isCI = !!process.env.CI;
const appURL = appBaseURL();
const storybookURL = storybookBaseURL();

// Only spin up local servers for targets that resolve to localhost.
const webServers = [
  ...(!isCI && !process.env.E2E_APP_URL
    ? [{
        command: 'bun run dev:app',
        url: appURL,
        ignoreHTTPSErrors: true, // self-signed / Tailscale certs locally
        reuseExistingServer: true,
        timeout: 60 * 1000,
      }]
    : []),
  ...(!isCI && !process.env.E2E_STORYBOOK_URL
    ? [{
        command: 'bun run storybook',
        url: storybookURL,
        ignoreHTTPSErrors: true, // self-signed / Tailscale certs locally
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }]
    : []),
];

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
    baseURL: appURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Production has valid HTTPS; local dev uses self-signed certs
    ignoreHTTPSErrors: !isCI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: webServers.length > 0 ? webServers : undefined,
});
