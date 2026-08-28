import { test, expect } from '@playwright/test';

/**
 * Deployed-Storybook smoke: proves the artifact this pipeline just shipped
 * boots and renders the flagship workbench stories with live widget content.
 *
 * Runs against STORYBOOK_URL (set by playwright.storybook.config.ts):
 *  - main pushes → https://story.wod.wiki
 *  - PR pushes   → https://<slug>.story.wod.wiki
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

test('Language Workbench story renders live parse and wall clock panel', async ({ page }) => {
  await page.goto(storyUrl('playground--empty-workbench'), { waitUntil: 'networkidle' });

  // Compiled statements strip and wall clock panel render on workbench boot
  await expect(page.getByTestId('statement-strip')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('panel-wallclock')).toBeVisible({ timeout: 15_000 });
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
