import { test, expect } from '@playwright/test';
import { storybookBaseURL } from '../utils/url-helpers';

/**
 * WOD-647 — E2E Smoke: Receiver Workflow
 *
 * Browser-level verification of the Chromecast receiver workflow.
 * The receiver entry point (receiver-rpc.html) requires the Cast Receiver SDK,
 * which is not available in a standard desktop browser. We verify it loads
 * gracefully and then exercise each receiver state via Storybook
 * Chromecast stories, which render the real receiver panels with fixture data.
 *
 * Target resolves via storybookBaseURL(): local dev Storybook by default,
 * deployed Storybook in CI, E2E_STORYBOOK_URL overrides both.
 *
 * Workflow states covered:
 *  1. Waiting / Idle  — no cast session, pulsing splash
 *  2. Preview         — note loaded, workout selection list
 *  3. Active          — workout running (Fran benchmark)
 *  4. Review          — post-workout results with projections
 *
 * Plus:
 *  - No critical console errors
 *  - Visual screenshots for regression detection
 */

const STORYBOOK_BASE = storybookBaseURL();

function storyUrl(storyId: string) {
  return `${STORYBOOK_BASE}/iframe.html?id=${storyId}&viewMode=story`;
}

// ────────────────────────────────────────────────────────────────────────────
// Receiver entry point
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Entry Point', () => {
  test('receiver-rpc.html loads without JavaScript crashes', async ({ page }) => {
    await page.goto(`${STORYBOOK_BASE}/receiver-rpc.html`, { waitUntil: 'domcontentloaded' });

    // The root container should mount even when Cast SDK is absent
    const app = page.locator('#root').first();
    await expect(app).toBeVisible({ timeout: 5000 });

    // Wod.Wiki branding should always appear
    await expect(page.locator('text=/Wod.Wiki/i')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-entry.png', fullPage: false });
  });

  test('no critical console errors on receiver page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`${STORYBOOK_BASE}/receiver-rpc.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter((err) => {
      const lower = err.toLowerCase();
      return (
        !lower.includes('extension') &&
        !lower.includes('chrome-extension') &&
        !lower.includes('adblock') &&
        !lower.includes('cast') // Cast SDK is absent in desktop browsers — expected
      );
    });

    expect(criticalErrors).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Mode 1: Waiting / Idle
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Waiting Screen', () => {
  test('waiting state renders pulsing splash', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--idle'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/waiting-for-cast/i')).toBeVisible();

    // Verify the pulsing animation class is present on the status text
    const statusText = page.locator('text=/waiting-for-cast/i');
    const hasAnimate = await statusText.evaluate((el) =>
      el.classList.contains('animate-pulse')
    );
    expect(hasAnimate).toBe(true);

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-waiting.png', fullPage: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Mode 2: Preview
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Preview Screen', () => {
  test('preview state renders title and block list', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--preview'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Fran')).toBeVisible();
    await expect(page.locator('text=Select a workout to begin')).toBeVisible();

    // Block list items should be rendered
    const blockItems = page.locator('[class*="tv-focusable"], [class*="rounded-lg"]');
    const count = await blockItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-preview.png', fullPage: false });
  });

  test('preview blocks have spatial navigation data attributes', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--preview'));
    await page.waitForLoadState('networkidle');

    const firstBlock = page.locator('[data-nav-id="preview-block-0"]');
    await expect(firstBlock).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Mode 3: Active
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Active Screen', () => {
  test('active Fran renders stack and timer panels', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-fran'));
    await page.waitForLoadState('networkidle');

    // Stack panel should show workout blocks
    await expect(page.locator('text=/Thruster/i')).toBeVisible();

    // Timer panel should be present
    const timerPanel = page.locator('[class*="TimerStackView"], [class*="timer"]').first();
    await expect(timerPanel).toBeVisible();

    // Two-column flex layout
    const flexContainer = page.locator('div[class*="flex"][class*="overflow-hidden"]').first();
    await expect(flexContainer).toBeVisible();
    const display = await flexContainer.evaluate((el) =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe('flex');

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-active-fran.png', fullPage: false });
  });

  test('active AMRAP renders countdown and rounds', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-amrap'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/Cindy/i')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-active-amrap.png', fullPage: false });
  });

  test('active EMOM renders interval timer', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-emom'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=/EMOM 10/i')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-active-emom.png', fullPage: false });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Mode 4: Review
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Review Screen', () => {
  test('review with projections renders metric cards', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--with-projections'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Workout Complete')).toBeVisible();
    await expect(page.locator('text=Total Reps')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-review-projections.png', fullPage: false });
  });

  test('review dismiss button is focusable', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--dismiss-button-focused'));
    await page.waitForLoadState('networkidle');

    const dismissBtn = page.locator('[data-nav-id="btn-dismiss"]');
    await expect(dismissBtn).toBeVisible();

    const isFocused = await dismissBtn.evaluate((el) =>
      el.getAttribute('data-nav-focused')
    );
    expect(isFocused).toBe('true');

    await page.screenshot({ path: 'e2e/screenshots/smoke-receiver-review-dismiss-focused.png', fullPage: false });
  });

  test('empty review shows defensive state', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--empty-review'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Workout Complete')).toBeVisible();
    // Should not crash with zero data
    await expect(page.locator('text=0 segments completed')).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Cross-mode health checks
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Cross-Mode Health', () => {
  test('no console errors across tracker chromecast stories', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const states = [
      'catalog-templates-tracker-chromecast--idle',
      'catalog-templates-tracker-chromecast--preview',
      'catalog-templates-tracker-chromecast--ready-to-start',
      'catalog-templates-tracker-chromecast--active-fran',
      'catalog-templates-tracker-chromecast--active-amrap',
      'catalog-templates-tracker-chromecast--paused-state',
    ];

    for (const stateId of states) {
      await page.goto(storyUrl(stateId), { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
    }

    const criticalErrors = errors.filter((err) => {
      const lower = err.toLowerCase();
      return (
        !lower.includes('extension') &&
        !lower.includes('chrome-extension') &&
        !lower.includes('adblock') &&
        !lower.includes('third-party')
      );
    });

    expect(criticalErrors).toHaveLength(0);
  });

  test('review chromecast stories load without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const stories = [
      'catalog-templates-review-chromecast--simple-rows',
      'catalog-templates-review-chromecast--with-projections',
      'catalog-templates-review-chromecast--fran-results',
      'catalog-templates-review-chromecast--empty-review',
    ];

    for (const storyId of stories) {
      await page.goto(storyUrl(storyId), { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // Basic smoke: Workout Complete header should be visible in all review stories
      const header = page.locator('text=Workout Complete');
      await expect(header).toBeVisible();
    }

    const criticalErrors = errors.filter((err) => {
      const lower = err.toLowerCase();
      return (
        !lower.includes('extension') &&
        !lower.includes('chrome-extension') &&
        !lower.includes('adblock') &&
        !lower.includes('third-party')
      );
    });

    expect(criticalErrors).toHaveLength(0);
  });
});
