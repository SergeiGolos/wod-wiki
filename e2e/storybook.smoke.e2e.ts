import { test, expect } from '@playwright/test';

/**
 * Deployed-Storybook smoke: proves the artifact this pipeline just shipped
 * boots and renders the flagship workbench stories with live widget content.
 *
 * Runs against STORYBOOK_URL (set by playwright.storybook.config.ts):
 *  - main pushes → https://story.wod.wiki
 *  - PR pushes   → https://<slug>.story.wod.wiki
 *
 * Story IDs are pinned against the build's index.json — the manager-only
 * viewport here; mobile (375px) and dark-theme passes live in
 * storybook.mobile/dark.smoke.e2e.ts.
 *
 * Unit-level interaction coverage lives in apps/storybook tests
 * (vitest browser mode); this suite is the deployed-artifact gate.
 */

function storyUrl(storyId: string) {
  return `/iframe.html?id=${storyId}&viewMode=story`;
}

test('Storybook manager loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/storybook/i);
});

test('Benchmark Fran workbench renders live parse and runtime panels', async ({ page }) => {
  await page.goto(storyUrl('workbench-benchmark-fran--standard-couplet'), { waitUntil: 'networkidle' });

  const workbench = page.getByTestId('language-workbench');
  await expect(workbench).toBeVisible({ timeout: 15_000 });

  // Live parse over the default script (parser debug panel shows statements)
  await expect(page.getByTestId('panel-parser')).toBeVisible();
  await expect(page.getByTestId('parsed-statement-0')).toBeVisible();

  // Wall-clock runtime surface is mounted
  await expect(page.getByTestId('panel-wallclock').first()).toBeVisible();
});

test('Analytics Widgets story renders a widget', async ({ page }) => {
  await page.goto(storyUrl('gallery-analytics-widgets--query-value-widget'), { waitUntil: 'networkidle' });
  // WidgetFrame renders a titled card over sample QueryResult data
  await expect(page.locator('text=Avg TIS').first()).toBeVisible({ timeout: 15_000 });
});

test('WQL Composer story renders clauses', async ({ page }) => {
  await page.goto(storyUrl('gallery-wql-composer--default'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="wql-composer"], .wql-composer').first()).toBeVisible({ timeout: 15_000 });
});
