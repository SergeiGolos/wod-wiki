import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// Mirror the playwright configs: load machine-local overrides so HTTPS_CERT /
// HTTPS_HOST are visible when specs resolve their own base URLs.
loadDotenv({ path: resolve(import.meta.dirname, '../../.env.local'), override: true });

const isCI = !!process.env.CI;

/**
 * Base URL for the app under test.
 *  1. E2E_APP_URL — explicit override (any environment)
 *  2. CI — production
 *  3. local — Vite dev server on :5173 (mirrors playwright.journal.config.ts)
 */
export function appBaseURL(): string {
  if (process.env.E2E_APP_URL) return process.env.E2E_APP_URL;
  if (isCI) return 'https://wod.wiki';
  const httpsHost = process.env.HTTPS_HOST;
  return httpsHost ? `https://${httpsHost}:5173` : 'http://localhost:5173';
}

