/**
 * EffortDetailPage — E2E Acceptance Tests
 *
 * Archetype: ACCEPTANCE — targets stories/catalog/pages/EffortDetailPage
 *
 * Validates:
 *  - Storybook stories load without console errors
 *  - Bundled effort renders label, slug, MET, discipline, aliases, origin badge
 *  - High-intensity effort renders correctly
 *  - With modifiers story shows resolved tab with effective values
 *  - Mobile viewport renders without errors
 */

import { test, expect, Page } from '@playwright/test';

// ─ Story URL helpers ──────────────────────────────────────────────────────────

function storyUrl(storyId: string): string {
  return `/iframe.html?id=${storyId}&viewMode=story`;
}

const STORIES = {
  bundled: 'catalog-pages-effortdetailpage--bundled-effort',
  highIntensity: 'catalog-pages-effortdetailpage--high-intensity-effort',
  withModifiers: 'catalog-pages-effortdetailpage--with-modifiers',
  mobile: 'catalog-pages-effortdetailpage--mobile',
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

// ─ Smoke tests — all stories render ──────────────────────────────────────────

test.describe('EffortDetailPage — Smoke', () => {
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

// ─ Bundled effort ───────────────────────────────────────────────────────────

test.describe('EffortDetailPage — Bundled Effort', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.bundled);
  });

  test('displays effort label and slug', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Rowing' })).toBeVisible();
    await expect(page.getByText('rowing', { exact: true }).first()).toBeVisible();
  });

  test('shows bundled origin badge', async ({ page }) => {
    await expect(page.getByText('Bundled', { exact: true }).first()).toBeVisible();
  });

  test('shows MET and discipline', async ({ page }) => {
    await expect(page.getByRole('main').getByText('MET', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('7.0', { exact: true })).toBeVisible();
  });

  test('renders aliases', async ({ page }) => {
    await expect(page.getByText('row', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('rower', { exact: true }).first()).toBeVisible();
  });

  test('shows attributes card', async ({ page }) => {
    await expect(page.getByText('Attributes').first()).toBeVisible();
  });

  test('shows analytics placeholder', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  });

  test('clone button is visible for bundled efforts', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Clone/i })).toBeVisible();
  });

  test('edit button is hidden for bundled efforts', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Edit/i })).not.toBeVisible();
  });
});

// ─ High-intensity effort ────────────────────────────────────────────────────

test.describe('EffortDetailPage — High Intensity', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.highIntensity);
  });

  test('displays effort label', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Kettlebell Snatch' })).toBeVisible();
  });

  test('shows high intensity badge', async ({ page }) => {
    await expect(page.getByText('High')).toBeVisible();
  });

  test('shows elevated MET', async ({ page }) => {
    await expect(page.getByRole('main').getByText('MET', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('12.0', { exact: true })).toBeVisible();
  });
});

// ─ With modifiers (resolved tab) ────────────────────────────────────────────

test.describe('EffortDetailPage — With Modifiers', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.withModifiers);
  });

  test('shows resolved and definition tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Resolved/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Definition/i })).toBeVisible();
  });

  test('shows effective resolution card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Effective Resolution' })).toBeVisible();
  });

  test('shows applied modifiers card', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Applied Modifiers' })).toBeVisible();
  });

  test('displays effective MET when modified', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Effective MET', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('7.0', { exact: true })).toBeVisible();
  });

  test('displays discipline factor', async ({ page }) => {
    await expect(page.getByText('Discipline Factor')).toBeVisible();
  });

  test('switching to definition tab shows attributes', async ({ page }) => {
    await page.getByRole('button', { name: /Definition/i }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Attributes').first()).toBeVisible();
  });
});
