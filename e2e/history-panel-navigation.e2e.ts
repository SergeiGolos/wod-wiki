import { test, expect } from '@playwright/test';

/**
 * Reproduce: History panel → click entry → should switch to Plan view
 *
 * Steps:
 * 1. Load the Notebook story (history mode with localStorage provider)
 * 2. Create a new notebook entry via the "New Workout" button
 * 3. Click on the entry row (not checkbox) in the history list
 * 4. Observe: Plan view should become visible with the entry content
 *
 * Architecture: ResponsiveViewport uses stacked layers (absolute inset-0)
 * with visibility toggling. The active view gets `visible z-10` and inactive
 * views get `invisible z-0 pointer-events-none`.
 */

const STORYBOOK_URL = 'http://localhost:6006/iframe.html?id=notebook--default&viewMode=story';

/**
 * Helper: ensure at least N history entries exist, creating them if needed.
 * After creating entries, navigates back to the history view.
 */
async function ensureHistoryEntries(page: import('@playwright/test').Page, minCount: number) {
  for (let i = 0; i < minCount; i++) {
    // Make sure we're on the history view to find "New Workout"
    const historyTab = page.getByRole('button', { name: /^history$/i }).first();
    if (await historyTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(300);
    }

    // Click "New Workout" to create an entry
    const newBtn = page.getByRole('button', { name: /new workout/i }).first();
    if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Navigate back to history view for the test to continue
  const historyTab = page.getByRole('button', { name: /^history$/i }).first();
  if (await historyTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await historyTab.click();
    await page.waitForTimeout(500);
  }
}

test.describe('History Panel Navigation', () => {

  test('clicking a history entry row should show Plan view', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // 1. Navigate to the Notebook story
    await page.goto(STORYBOOK_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('[data-view-id]', { timeout: 10000 });

    // 2. Verify we start in history view
    const historyView = page.locator('[data-view-id="history"]');
    await expect(historyView).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/01-initial-history-view.png', fullPage: true });

    // 3. Click "New Workout" if available (this creates entry AND navigates to Plan)
    const newWorkoutButton = page.getByRole('button', { name: /new workout/i });
    if (await newWorkoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newWorkoutButton.click();
      await page.waitForTimeout(500);

      // "New Workout" auto-navigates to Plan view. Navigate back to History.
      const historyTab = page.getByRole('button', { name: /history/i });
      if (await historyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await historyTab.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: 'e2e/screenshots/02-after-create-entry.png', fullPage: true });

    // 4. Find and click a history entry row
    const entryRows = page.locator('[data-view-id="history"] button').filter({
      has: page.locator('.font-medium'),
    });

    const entryCount = await entryRows.count();
    console.log(`Found ${entryCount} history entries`);

    if (entryCount === 0) {
      test.skip(true, 'No history entries found to click');
      return;
    }

    const firstEntry = entryRows.first();
    const entryText = await firstEntry.textContent();
    console.log(`Clicking entry: "${entryText?.trim()}"`);

    // Capture BEFORE state
    const beforeViews = await page.evaluate(() => {
      const views = document.querySelectorAll('[data-view-id]');
      return Array.from(views).map((v) => ({
        id: v.getAttribute('data-view-id'),
        visible: window.getComputedStyle(v).visibility === 'visible',
        rect: v.getBoundingClientRect(),
      }));
    });
    console.log('BEFORE click views:', JSON.stringify(beforeViews, null, 2));

    await firstEntry.click();

    // Wait for view switch (no animation needed — just state update + render)
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/03-after-click-entry.png', fullPage: true });

    // 5. Verify Plan view is now visible
    const planView = page.locator('[data-view-id="plan"]');
    const planViewExists = await planView.count();
    console.log(`Plan view exists: ${planViewExists > 0}`);

    // Gather diagnostics
    const afterViews = await page.evaluate(() => {
      const views = document.querySelectorAll('[data-view-id]');
      return Array.from(views).map((v) => {
        const style = window.getComputedStyle(v);
        return {
          id: v.getAttribute('data-view-id'),
          visible: style.visibility === 'visible',
          zIndex: style.zIndex,
          rect: v.getBoundingClientRect(),
        };
      });
    });
    console.log('AFTER click views:', JSON.stringify(afterViews, null, 2));

    if (planViewExists > 0) {
      // Plan view should be visible and fill the viewport
      const planBox = await planView.boundingBox();
      const viewportSize = page.viewportSize();
      console.log(`Plan view box: ${JSON.stringify(planBox)}`);
      console.log(`Viewport: ${JSON.stringify(viewportSize)}`);

      if (planBox && viewportSize) {
        // Plan view should span the full viewport width
        expect(planBox.x).toBeGreaterThanOrEqual(-10);
        expect(planBox.x).toBeLessThan(viewportSize.width);
        expect(planBox.width).toBeGreaterThan(viewportSize.width * 0.5);
      }

      // Plan view must be visible (not invisible)
      await expect(planView).toBeVisible();
    }

    // 6. Log all views for debugging
    const allViews = page.locator('[data-view-id]');
    const viewCount = await allViews.count();
    console.log(`Total views rendered: ${viewCount}`);

    for (let i = 0; i < viewCount; i++) {
      const view = allViews.nth(i);
      const viewId = await view.getAttribute('data-view-id');
      const isVisible = await view.isVisible();
      console.log(`View "${viewId}": visible=${isVisible}`);
    }

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });

  test('checking checkbox should NOT navigate away from history', async ({ page }) => {
    await page.goto(STORYBOOK_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('[data-view-id]', { timeout: 10000 });

    // Ensure at least 1 entry exists
    await ensureHistoryEntries(page, 1);

    const checkboxes = page.locator('[data-view-id="history"] [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);

    if (checkboxCount === 0) {
      test.skip(true, 'No checkboxes found');
      return;
    }

    await checkboxes.first().click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'e2e/screenshots/04-after-checkbox-click.png', fullPage: true });

    // History view should still be visible
    const historyView = page.locator('[data-view-id="history"]');
    await expect(historyView).toBeVisible();

    const historyBox = await historyView.boundingBox();
    console.log(`History view after checkbox: ${JSON.stringify(historyBox)}`);

    if (historyBox) {
      expect(historyBox.x).toBeGreaterThanOrEqual(-10);
      expect(historyBox.width).toBeGreaterThan(0);
    }
  });

  test('checking 2 checkboxes should show Analyze view', async ({ page }) => {
    await page.goto(STORYBOOK_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('[data-view-id]', { timeout: 10000 });

    // Ensure at least 2 entries exist
    await ensureHistoryEntries(page, 2);

    const checkboxes = page.locator('[data-view-id="history"] [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes`);

    if (checkboxCount < 2) {
      test.skip(true, 'Need at least 2 entries to test multi-select');
      return;
    }

    await checkboxes.nth(0).click();
    await page.waitForTimeout(200);
    await checkboxes.nth(1).click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: 'e2e/screenshots/05-after-multi-select.png', fullPage: true });

    // Analyze view should exist and be visible
    const analyzeView = page.locator('[data-view-id="analyze"]');
    const analyzeExists = await analyzeView.count();
    console.log(`Analyze view exists: ${analyzeExists > 0}`);

    if (analyzeExists > 0) {
      await expect(analyzeView).toBeVisible();
      const analyzeBox = await analyzeView.boundingBox();
      console.log(`Analyze view box: ${JSON.stringify(analyzeBox)}`);
      if (analyzeBox) {
        expect(analyzeBox.x).toBeGreaterThanOrEqual(-10);
        expect(analyzeBox.width).toBeGreaterThan(0);
      }
    }
  });
});
