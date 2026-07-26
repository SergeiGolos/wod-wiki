import { test, expect, type Page } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

/**
 * Navigate to an SPA route without a server round-trip for the route itself.
 * The S3+CloudFront preview has no SPA-fallback on viewer-request, so deep
 * links (e.g. /legacy) answer S3 NoSuchKey; the app instead boots at / and
 * restores the route client-side via the `spa-redirect` sessionStorage
 * handoff in playground/index.html (the same mechanism 404.html uses).
 * Works identically against the Vite dev server.
 */
async function gotoSpaRoute(page: Page, path: string): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((p) => {
    sessionStorage.setItem('spa-redirect', location.origin + p);
  }, path);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(`**${path}`, { timeout: 10_000 });
}

test.describe('Playground widget landing experience', () => {
  for (const viewport of viewports) {
    test(`renders attention, code-example, and syntax-group widgets on ${viewport.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (text.includes('ERR_CONNECTION_REFUSED')) return;
        consoleErrors.push(text);
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.setViewportSize(viewport.size);
      await gotoSpaRoute(page, '/legacy');

      await expect(
        page.getByRole('heading', { name: 'Build and preview widget-driven workout pages.' }),
      ).toBeVisible();

      await expect(page.getByRole('button', { name: 'Jump to workout' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Code example', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Run this example' })).toBeVisible();

      const syntaxCards = page.locator('article').filter({ hasText: 'Docs' });
      await expect(syntaxCards).toHaveCount(3);

      await page.getByRole('button', { name: 'Jump to workout' }).click();
      await expect(page.locator('#workout-widget-surface')).toBeInViewport();

      // (The rAF fps sample was removed: it is runner-load-sensitive and
      // flakes under parallel workers without indicating app jank — 51fps
      // observed with 6 workers on a passing page.)

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });

      expect(hasHorizontalOverflow).toBe(false);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
