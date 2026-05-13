import { defineConfig, devices } from '@playwright/test';

const previewBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://preview.wod.wiki';

export default defineConfig({
  testDir: './e2e',
  // Keep preview acceptance bounded: prove the published playground boots
  // and renders live widget content from the deployed preview surface.
  testMatch: ['**/live-app/playground-widget-block-preview.e2e.ts'],
  timeout: 45 * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/preview-e2e-junit.xml' }], ['github']]
    : 'html',
  use: {
    baseURL: previewBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'preview-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
