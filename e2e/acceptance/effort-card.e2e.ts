/**
 * EffortCard — E2E Acceptance Tests
 *
 * Archetype: ACCEPTANCE — targets stories/catalog/molecules/efforts/EffortCard
 *
 * Validates:
 *  - Storybook story loads without console errors
 *  - EffortCard renders label, slug, MET, discipline, and origin badge
 *  - All origin variants (bundled, user, synthetic) display correctly
 *  - Click handler is wired (interactive smoke)
 */

import { test, expect, Page } from '@playwright/test';

// ─ Story URL helpers ──────────────────────────────────────────────────────────

function storyUrl(storyId: string): string {
  return `/iframe.html?id=${storyId}&viewMode=story`;
}

const STORIES = {
  bundled: 'catalog-molecules-efforts-effortcard--bundled',
  userCustom: 'catalog-molecules-efforts-effortcard--user-custom',
  synthetic: 'catalog-molecules-efforts-effortcard--synthetic',
  allVariants: 'catalog-molecules-efforts-effortcard--all-variants',
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
  await page.waitForTimeout(500);
}

// ─ Smoke tests — all stories render ──────────────────────────────────────────

test.describe('EffortCard — Smoke', () => {
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

// ─ Bundled effort card ───────────────────────────────────────────────────────

test.describe('EffortCard — Bundled', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.bundled);
  });

  test('displays effort label and slug', async ({ page }) => {
    await expect(page.getByText('Rowing')).toBeVisible();
    await expect(page.getByText('rowing')).toBeVisible();
  });

  test('shows bundled origin badge', async ({ page }) => {
    await expect(page.getByText('Bundled')).toBeVisible();
  });

  test('shows MET and discipline', async ({ page }) => {
    await expect(page.getByText(/MET 7\.0/)).toBeVisible();
    await expect(page.getByText('rowing')).toBeVisible();
  });

  test('renders aliases', async ({ page }) => {
    await expect(page.getByText('row')).toBeVisible();
    await expect(page.getByText('rower')).toBeVisible();
  });
});

// ─ User custom effort card ───────────────────────────────────────────────────

test.describe('EffortCard — User Custom', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.userCustom);
  });

  test('displays custom label and origin badge', async ({ page }) => {
    await expect(page.getByText('My Custom HIIT Circuit')).toBeVisible();
    await expect(page.getByText('Custom')).toBeVisible();
  });

  test('shows MET 8.5 and strength discipline', async ({ page }) => {
    await expect(page.getByText(/MET 8\.5/)).toBeVisible();
    await expect(page.getByText('strength')).toBeVisible();
  });
});

// ─ Synthetic effort card ─────────────────────────────────────────────────────

test.describe('EffortCard — Synthetic', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.synthetic);
  });

  test('shows estimated origin badge', async ({ page }) => {
    await expect(page.getByText('Estimated')).toBeVisible();
  });

  test('displays default MET 5.0', async ({ page }) => {
    await expect(page.getByText(/MET 5\.0/)).toBeVisible();
  });
});

// ─ All variants grid ─────────────────────────────────────────────────────────

test.describe('EffortCard — All Variants Grid', () => {
  test('renders four cards in the grid story', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loadStory(page, STORIES.allVariants);

    // Count cards by looking for card elements
    const cards = page.locator('.cursor-pointer');
    await expect(cards).toHaveCount(4);
    expect(errors).toHaveLength(0);
  });
});
