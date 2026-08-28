import { test, expect, type Page } from '@playwright/test';

/**
 * Dark-theme gate (storybook-dark project): the theme toolbar global reaches
 * the story — the preview decorator mounts a `.dark` wrapper — and flagship
 * stories still render structurally with it applied.
 *
 * NOTE(#994): the palette itself does not flip yet — the packages/ui @theme
 * bridge bakes the light :root values into the --color-* chain, so every story
 * still renders light under the wrapper (inventory 008, H1). Real color
 * assertions land with that fix; this pass pins the theme plumbing so the
 * change is observable in CI.
 */

const STORIES = [
  'gallery-wql-composer--default',
  'gallery-analytics-widgets--query-value-widget',
  'workbench-benchmark-fran--standard-couplet',
];

async function renderedContent(page: Page) {
  return (await page.locator('body').innerText()).trim().length;
}

for (const storyId of STORIES) {
  test(`dark global applies on ${storyId}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:dark`, { waitUntil: 'networkidle' });

    // Theme global → preview decorator → .dark wrapper element
    const hasDarkHost = await page.evaluate(() => document.querySelector('.dark') !== null);
    expect(hasDarkHost).toBe(true);

    await expect.poll(() => renderedContent(page), { timeout: 15_000 }).toBeGreaterThan(30);
  });
}
