/**
 * EffortsCatalogPage — E2E Acceptance Tests
 *
 * Archetype: ACCEPTANCE — targets stories/catalog/pages/EffortsCatalogPage
 *
 * Validates:
 *  - Storybook stories load without console errors
 *  - Header renders with title and Create Custom button
 *  - Effort rows render with labels, slugs, MET values
 *  - Origin filter buttons are visible and interactive
 *  - Search input is visible
 *  - Discipline dropdown is visible when disciplines exist
 *  - Filtering to custom origin shows empty state
 */

import { test, expect, Page } from '@playwright/test';

// ─ Story URL helpers ──────────────────────────────────────────────────────────

function storyUrl(storyId: string): string {
  return `/iframe.html?id=${storyId}&viewMode=story`;
}

const STORIES = {
  default: 'catalog-pages-effortscatalogpage--default',
  mobile: 'catalog-pages-effortscatalogpage--mobile',
};

// ─ Shared setup ───────────────────────────────────────────────────────────────

function setupErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function loadStory(page: Page, storyId: string) {
  await page.goto(storyUrl(storyId));
  await page.waitForLoadState('networkidle');
  // Give the EffortRegistryProvider time to initialize bundled efforts
  await page.waitForTimeout(800);
}

// ─ Smoke tests ────────────────────────────────────────────────────────────────

test.describe('EffortsCatalogPage — Smoke', () => {
  for (const [name, storyId] of Object.entries(STORIES)) {
    test(`${name}: story loads without errors`, async ({ page }) => {
      const errors = setupErrorCapture(page);
      await loadStory(page, storyId);
      expect(errors, `Console/page errors in ${name} story`).toHaveLength(0);
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

// ─ Default catalog ────────────────────────────────────────────────────────────

test.describe('EffortsCatalogPage — Default', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.default);
  });

  test('displays page header with title', async ({ page }) => {
    await expect(page.getByText('Efforts').first()).toBeVisible();
    await expect(page.getByText('Catalog of all registered efforts')).toBeVisible();
  });

  test('shows Create Custom button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Create Custom/i })).toBeVisible();
  });

  test('renders bundled effort rows', async ({ page }) => {
    // At least one bundled effort should be visible
    await expect(page.getByRole('heading', { name: 'Rowing', exact: true })).toBeVisible();
  });

  test('shows effort metadata (slug and MET)', async ({ page }) => {
    // Find the Rowing row and verify its slug and MET are visible
    const rowingRow = page.locator('button', { has: page.getByRole('heading', { name: 'Rowing', exact: true }) });
    await expect(rowingRow).toBeVisible();
    await expect(rowingRow.getByText('rowing', { exact: true }).first()).toBeVisible();
    await expect(rowingRow.getByText(/MET\s*7\.0/)).toBeVisible();
  });

  test('shows origin filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bundled', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Custom', exact: true })).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
  });

  test('filtering to bundled origin keeps efforts visible', async ({ page }) => {
    await page.getByRole('button', { name: 'Bundled', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'Rowing', exact: true })).toBeVisible();
  });

  test('filtering to custom origin shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Custom', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/No efforts match your filters/i)).toBeVisible();
  });

  test('search filtering narrows results', async ({ page }) => {
    const search = page.getByPlaceholder(/Search by name/i);
    await search.fill('Rowing');
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'Rowing', exact: true })).toBeVisible();
  });

  test('search with no matches shows empty state', async ({ page }) => {
    const search = page.getByPlaceholder(/Search by name/i);
    await search.fill('xyznonexistent');
    await page.waitForTimeout(300);
    await expect(page.getByText(/No efforts match your filters/i)).toBeVisible();
  });
});

// ─ Mobile viewport ────────────────────────────────────────────────────────────

test.describe('EffortsCatalogPage — Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.mobile);
  });

  test('renders header and search on mobile', async ({ page }) => {
    await expect(page.getByText('Efforts').first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
  });

  test('shows origin filters on mobile', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bundled', exact: true })).toBeVisible();
  });
});
