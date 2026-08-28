import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile gate (storybook-mobile-375 project): flagship stories render with
 * zero horizontal overflow at a 375px viewport.
 *
 * Scope is deliberate (map #990 acceptance gate): only stories verified clean
 * by the dark-mode/mobile inventory (docs/research/008). The workbench stories
 * (benchmark Fran, playground starters) overflow today — the Session Outputs
 * Table card-list ticket (#997) adds them here once fixed.
 */

const STORIES = [
  'gallery-wql-composer--default',
  'gallery-analytics-widgets--query-value-widget',
  'gallery-wql-example-gallery--table-section',
  'gallery-wql-example-gallery--value-section',
];

async function renderedContent(page: Page) {
  return (await page.locator('body').innerText()).trim().length;
}

for (const storyId of STORIES) {
  test(`${storyId} has no horizontal overflow at 375px`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, { waitUntil: 'networkidle' });

    await expect.poll(() => renderedContent(page), { timeout: 15_000 }).toBeGreaterThan(30);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}
