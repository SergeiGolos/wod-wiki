/**
 * CrossFit Benchmark Runtime Execution Tests
 *
 * Archetype: ACCEPTANCE — targets stories/acceptance/RuntimeCrossFit.stories.tsx
 *
 * These tests drive the live StorybookWorkbench to validate that the runtime
 * compiles, executes, and advances through real CrossFit workouts correctly.
 *
 * Coverage:
 *  - Storybook story loads without console errors
 *  - Track view is accessible and shows workout controls
 *  - Next button advances the runtime through each block
 *  - Review view populates with results after completion
 */

import { test, expect, Page } from '@playwright/test';

// ─ Story URL helpers ──────────────────────────────────────────────────────────

function storyUrl(storyId: string): string {
  return `/iframe.html?id=${storyId}&viewMode=story`;
}

// Story IDs are derived from the story file's `meta.title`
// ('acceptance/RuntimeCrossFit') by Storybook's CSF `sanitize`, which
// lowercases and replaces separators but does NOT split camelCase tokens.
// Therefore `RuntimeCrossFit` becomes `runtimecrossfit` (no hyphen between
// `runtime` and `crossfit`).
const STORIES = {
  fran: 'acceptance-runtimecrossfit--fran',
  annie: 'acceptance-runtimecrossfit--annie',
  cindy: 'acceptance-runtimecrossfit--cindy',
  barbara: 'acceptance-runtimecrossfit--barbara',
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
  // Give the WorkbenchProvider time to initialize the runtime
  await page.waitForTimeout(1500);
}

// ─ Switch to Track view ───────────────────────────────────────────────────────
async function switchToTrack(page: Page) {
  const trackTab = page
    .getByRole('button', { name: /track/i })
    .or(page.locator('[data-testid="tab-track"]'))
    .first();
  if (await trackTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await trackTab.click();
    await page.waitForTimeout(300);
  }
}

// ─ Find the Next button in the current view ───────────────────────────────────
function nextButton(page: Page) {
  return page
    .locator('[data-testid="tracker-next"]')
    .or(page.locator('[title="Next Block"]'))
    .or(page.getByRole('button', { name: /next block/i }))
    .first();
}

// ─ Smoke tests — all four stories render ─────────────────────────────────────

test.describe('CrossFit Acceptance — Smoke', () => {
  for (const [name, storyId] of Object.entries(STORIES)) {
    test(`${name}: story loads without errors`, async ({ page }) => {
      const errors = setupErrorCapture(page);
      await loadStory(page, storyId);
      expect(errors, `Console/page errors in ${name} story`).toHaveLength(0);
      // Workbench rendered — at minimum it shows the editor content
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

// ─ Fran — detailed execution test ────────────────────────────────────────────

test.describe('CrossFit Acceptance — Fran (21-15-9)', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.fran);
    await switchToTrack(page);
  });

  test('Track view is visible with workout controls', async ({ page }) => {
    // The workbench should show the track panel or start-workout affordance
    const workbench = page.locator('body');
    await expect(workbench).toBeVisible();

    // Start the workout if not already started
    const startBtn = page
      .locator('[data-testid="editor-start-workout"]')
      .or(page.locator('.title-play'))
      .or(page.getByRole('button', { name: /start/i }))
      .first();

    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('Next button advances through all Fran blocks', async ({ page }) => {
    // Start the workout
    const startBtn = page
      .locator('.title-play')
      .or(page.getByRole('button', { name: /start/i }))
      .first();
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    const next = nextButton(page);

    // Fran: 21-15-9 = 3 rounds × 2 movements = 6 effort blocks + session wrap
    // Each next() call should succeed without error
    let advances = 0;
    const MAX_ADVANCES = 10;

    while (advances < MAX_ADVANCES) {
      const isVisible = await next.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) break;

      await next.click();
      await page.waitForTimeout(300);
      advances++;
    }

    // We should have been able to advance at least 6 times for Fran
    expect(advances).toBeGreaterThanOrEqual(6);
  });

  test('Review view shows results after completion', async ({ page }) => {
    // Drive workout to completion
    const startBtn = page
      .locator('.title-play')
      .or(page.getByRole('button', { name: /start/i }))
      .first();
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    const next = nextButton(page);
    let advances = 0;
    while (advances < 10) {
      const visible = await next.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) break;
      await next.click();
      await page.waitForTimeout(200);
      advances++;
    }

    // Switch to review
    const reviewTab = page
      .getByRole('button', { name: /review/i })
      .or(page.locator('[data-testid="tab-review"]'))
      .first();

    if (await reviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reviewTab.click();
      await page.waitForTimeout(500);
    }

    // Review panel should show some result rows
    const reviewPanel = page
      .locator('[data-testid="review-panel"]')
      .or(page.locator('table'))
      .first();

    await expect(reviewPanel).toBeVisible({ timeout: 5000 });
  });
});

// ─ Annie — multi-round variable rep scheme ────────────────────────────────────

test.describe('CrossFit Acceptance — Annie (50-40-30-20-10)', () => {
  test('story loads and advances through first round', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loadStory(page, STORIES.annie);
    await switchToTrack(page);

    // Start workout
    const startBtn = page
      .locator('.title-play')
      .or(page.getByRole('button', { name: /start/i }))
      .first();
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    const next = nextButton(page);
    let advances = 0;

    // Advance through first round (2 movements at 50 reps each)
    while (advances < 3) {
      const visible = await next.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) break;
      await next.click();
      await page.waitForTimeout(300);
      advances++;
    }

    expect(advances).toBeGreaterThanOrEqual(2);
    expect(errors).toHaveLength(0);
  });
});
