import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

const httpsHost = process.env.HTTPS_HOST;
const appBaseURL = httpsHost
  ? `https://${httpsHost}:5173`
  : 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 45 * 1000,
  use: {
    baseURL: appBaseURL,
    ignoreHTTPSErrors: !!httpsHost,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
  ],
});
