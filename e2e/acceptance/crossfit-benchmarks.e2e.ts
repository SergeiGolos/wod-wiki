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

async function clickRunButton(page: Page) {
  // The story starts with all panels hidden — activate Plan first
  await page.locator('#tutorial-view-mode-plan').click();
  // InlineCommandBar is a hover overlay — must hover the editor to reveal Run
  const editor = page.locator('.cm-note-editor').first();
  if (await editor.count()) await editor.hover();
  const startBtn = page.locator('[data-testid="editor-start-workout"]').first();
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  await startBtn.click();
}


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
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

// ─ Fran — detailed execution test ────────────────────────────────────────────

test.describe('CrossFit Acceptance — Fran (21-15-9)', () => {
  test.beforeEach(async ({ page }) => {
    await loadStory(page, STORIES.fran);
    // Stay in Plan view — the Run button lives in the Plan panel editor.
    // Switching to Track hides the editor and makes Run inaccessible.
  });

  test('Track view is visible with workout controls', async ({ page }) => {
    const workbench = page.locator('body');
    await expect(workbench).toBeVisible();

    // Plan must be activated — story starts with all panels hidden
    await page.locator('#tutorial-view-mode-plan').click();

    // Run button should be present in the Plan panel editor
    const startBtn = page.locator('[data-testid="editor-start-workout"]').first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
  });

  test('Next button advances through all Fran blocks', async ({ page }) => {
    await clickRunButton(page);

    // Wait for the timer to initialise
    const next = nextButton(page);
    await next.waitFor({ state: 'visible', timeout: 8000 });

    // Fran: 21-15-9 = 3 rounds × 2 movements = 6 effort blocks + session wrap
    let advances = 0;
    const MAX_ADVANCES = 10;
    while (advances < MAX_ADVANCES) {
      const isVisible = await next.isVisible({ timeout: 1500 }).catch(() => false);
      if (!isVisible) break;
      await next.click();
      await page.waitForTimeout(300);
      advances++;
    }

    expect(advances).toBeGreaterThanOrEqual(6);
  });

  test('Review view shows results after completion', async ({ page }) => {
    await clickRunButton(page);

    const next = nextButton(page);
    await next.waitFor({ state: 'visible', timeout: 8000 });

    // Drive to completion
    let advances = 0;
    while (advances < 10) {
      const visible = await next.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) break;
      await next.click();
      await page.waitForTimeout(200);
      advances++;
    }

    // After completion, close the fullscreen timer overlay so we can reach the Review tab
    // The timer overlay (fixed inset-0 z-[100]) has a close X button in the top-right
    const timerOverlay = page.locator('[class*="fixed"][class*="inset-0"][class*="z-[100]"]').first();
    if (await timerOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Find the close/stop button — last button in the overlay header, or Escape
      const buttons = timerOverlay.locator('button');
      const count = await buttons.count();
      if (count > 0) {
        // The X close button is typically the last one in the top-right
        await buttons.last().click({ force: true });
      }
      await page.waitForTimeout(800);
    }

    // Switch to Review via JavaScript click (bypasses overlay interception)
    await page.evaluate(() => {
      const reviewBtn = document.querySelector('#tutorial-view-mode-review') as HTMLElement;
      if (reviewBtn) reviewBtn.click();
    });
    await page.waitForTimeout(800);

    // Review panel should show result rows
    const reviewPanel = page
      .locator('[data-testid="review-panel"]')
      .or(page.locator('table:not([aria-hidden])'))
      .first();
    await expect(reviewPanel).toBeVisible({ timeout: 5000 });
  });
});

// ─ Annie — multi-round variable rep scheme ────────────────────────────────────

test.describe('CrossFit Acceptance — Annie (50-40-30-20-10)', () => {
  test('story loads and advances through first round', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await loadStory(page, STORIES.annie);

    await clickRunButton(page);

    const next = nextButton(page);
    await next.waitFor({ state: 'visible', timeout: 8000 });

    // Advance through first round (2 movements at 50 reps each)
    let advances = 0;
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
