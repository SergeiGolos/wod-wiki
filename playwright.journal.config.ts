import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

// Load .env.local overrides (gitignored, machine-local) so HTTPS_HOST is
// available here when the playground dev server is running with TLS.
loadDotenv({ path: resolve(__dirname, '.env.local'), override: true });

const httpsHost = process.env.HTTPS_HOST;
// E2E_TARGET=preview serves the production bundle (`bun run build:app` output)
// via `vite preview` on its default port 4173; unset targets the dev server.
// `vite preview` inherits the playground config's TLS: Tailscale certs on
// dev machines (https), plain http in CI where no certs exist.
const e2eTarget = process.env.E2E_TARGET;
const hasTailscaleCerts = fs
  .readdirSync(__dirname)
  .some((f) => f.endsWith('.ts.net.crt'));
const previewBaseURL = hasTailscaleCerts
  ? 'https://localhost:4173'
  : 'http://localhost:4173';
const appBaseURL =
  e2eTarget === 'preview'
    ? previewBaseURL
    : httpsHost
      ? `https://${httpsHost}:5173`
      : 'http://localhost:5173';
const trustSelfSigned =
  e2eTarget === 'preview' ? hasTailscaleCerts : !!httpsHost;

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
  retries: process.env.CI ? 1 : 0,
  // Files run in parallel across workers (CI caps at 4); with fullyParallel:
  // false, tests within a file still run serially, preserving the intra-file
  // ordering the comment below cares about.
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',

  use: {
    baseURL: appBaseURL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: trustSelfSigned, // trust self-signed / Tailscale certs locally
  },

  projects: [
    {
      name: 'journal-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: e2eTarget === 'preview' ? 'bun run preview:app' : 'bun run dev:app',
    url: appBaseURL,
    ignoreHTTPSErrors: trustSelfSigned, // self-signed / Tailscale certs locally
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
