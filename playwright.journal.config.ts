import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// Load .env.local overrides (gitignored, machine-local) so HTTPS_HOST is
// available here when the playground dev server is running with TLS.
loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

const httpsHost = process.env.HTTPS_HOST;
const appBaseURL = httpsHost
  ? `https://${httpsHost}:5173`
  : 'http://localhost:5173';

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
    baseURL: appBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: !!httpsHost, // trust self-signed / Tailscale certs locally
  },

  projects: [
    {
      name: 'journal-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'bun run dev:app',
    url: appBaseURL,
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
