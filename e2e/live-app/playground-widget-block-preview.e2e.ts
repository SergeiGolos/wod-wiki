import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

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
      await page.goto('/playground', { waitUntil: 'domcontentloaded' });

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

      const fps = await page.evaluate(async () => {
        const sampleFrames = 60;
        const stamps: number[] = [];

        await new Promise<void>((resolve) => {
          const tick = (now: number) => {
            stamps.push(now);
            if (stamps.length >= sampleFrames) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        });

        const deltas = stamps.slice(1).map((time, index) => time - stamps[index]!);
        const avgDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
        return 1000 / avgDelta;
      });

      expect(fps).toBeGreaterThanOrEqual(60);

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });

      expect(hasHorizontalOverflow).toBe(false);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
