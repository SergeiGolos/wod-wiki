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

test('Language Workbench story renders live parse and version badge', async ({ page }) => {
  await page.goto(storyUrl('workbench-language-workbench--workbench'), { waitUntil: 'networkidle' });

  // Version badge stamped at build time by scripts/stamp-version.ts
  const version = page.getByTestId('workbench-version');
  await expect(version).toBeVisible({ timeout: 15_000 });
  await expect(version).toContainText(/@bitcobblers\/wod-wiki-engine \d+\.\d+\.\d+/);

  // Live parse over the default script
  await expect(page.getByTestId('statement-count')).toHaveText(/[1-9]/);
});

test('Analytics Widgets story renders a widget', async ({ page }) => {
  await page.goto(storyUrl('workbench-analytics-widgets--query-value-widget'), { waitUntil: 'networkidle' });
  // WidgetFrame renders a titled card over sample QueryResult data
  await expect(page.locator('text=Avg TIS').first()).toBeVisible({ timeout: 15_000 });
});

test('WQL Composer story renders clauses', async ({ page }) => {
  await page.goto(storyUrl('workbench-wql-composer--default'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-testid="wql-composer"], .wql-composer').first()).toBeVisible({ timeout: 15_000 });
});
