import { expect, type Page } from '@playwright/test';

/**
 * Wait for the app's boot seed sync to settle before asserting on any
 * seed-gated surface (efforts catalog/detail, library, journal editor).
 *
 * The bootstrap reflects its gate on <html> for CI/e2e diagnostics
 * (apps/playground/src/services/seed/seedReadiness.ts):
 *   data-seed-state:   'idle' | 'preparing' | 'ready' | 'error'
 *   data-seed-outcome: last SeedSyncOutcome ('disabled' | 'current' | 'busy' |
 *                      'imported' | 'server-stale' | 'error'), cleared when a
 *                      new attempt starts.
 *
 * Without this gate, route-level visibility assertions measure seed-import
 * latency instead of app behavior (#1066: 20 deterministic CI failures). An
 * 'error' outcome ungates the UI with whatever rows exist — that fails here so
 * a seeded-surface test never passes on missing data.
 */
export async function waitForSeedReady(page: Page, timeout = 30_000): Promise<void> {
  const root = page.locator('html');
  await expect(root, 'boot seed sync must settle before the surface renders').toHaveAttribute(
    'data-seed-state',
    /^(ready|error)$/,
    { timeout },
  );
  if ((await root.getAttribute('data-seed-state')) === 'error') {
    throw new Error('Seed sync settled with outcome "error" — seeded rows may be missing');
  }
}
