import { test, expect } from '@playwright/test';
import { storybookBaseURL } from './utils/url-helpers';

/**
 * WOD-735 — Chromecast & TV Platform Testing
 *
 * Browser-level validation of the Chromecast receiver for TV platforms:
 *  1. TV-optimized rendering — layout is stable at 1920×1080 TV viewport
 *  2. Focus indicators — high-contrast ring, scale transform, box-shadow
 *  3. Web TV variant — standalone receiver mode renders without CAF
 */

const STORYBOOK_BASE = storybookBaseURL();

function storyUrl(storyId: string, args?: Record<string, string | boolean | number>) {
  const params = new URLSearchParams({ id: storyId });
  if (args) {
    params.set('args', Object.entries(args)
      .map(([k, v]) => `${k}:${v}`)
      .join(';'));
  }
  return `${STORYBOOK_BASE}/iframe.html?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. TV Viewport
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — TV Viewport (WOD-735)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('waiting shell renders correctly at 1080p TV viewport', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--idle'));
    await page.waitForLoadState('networkidle');

    const container = page.locator('body');
    await expect(container).toHaveScreenshot('receiver-tv-waiting-1080p.png', {
      maxDiffPixels: 100,
    });
  });

  test('active tracker layout is stable at 1080p TV viewport', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-fran'));
    await page.waitForLoadState('networkidle');

    const flexContainer = page.locator('div[class*="flex"][class*="overflow-hidden"]').first();
    await expect(flexContainer).toBeVisible();

    const display = await flexContainer.evaluate((el) =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe('flex');
  });

  test('review screen renders at 1080p with readable metrics', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--with-projections'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Workout Complete')).toBeVisible();
    await expect(page.locator('text=Total Reps')).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Focus Indicators
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Focus Indicators (WOD-735)', () => {
  test('dismiss button focus shows D-Pad focus ring', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--dismiss-button-focused'));
    await page.waitForLoadState('networkidle');

    const dismissBtn = page.locator('[data-nav-id="btn-dismiss"]');
    await expect(dismissBtn).toHaveAttribute('data-nav-focused', 'true');

    // Box shadow should be present (review panel uses Tailwind ring utilities)
    const boxShadow = await dismissBtn.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    expect(boxShadow).not.toBe('none');
    // Ring layer should be visible (4th layer from Tailwind ring-4)
    expect(boxShadow.split(',').length).toBeGreaterThanOrEqual(4);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Web TV Variant (Standalone Receiver)
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Web TV Variant / Standalone Mode (WOD-735)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('standalone waiting shell renders without CAF', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--idle'));
    await page.waitForLoadState('networkidle');

    // The idle story renders the waiting shell
    await expect(page.locator('text=/Wod.Wiki/i')).toBeVisible();
    await expect(page.locator('text=/waiting-for-cast/i')).toBeVisible();

    // Verify no JS errors from missing CAF
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    // Small wait to catch any async errors
    await page.waitForTimeout(500);
    expect(consoleErrors.filter((e) => e.includes('cast') || e.includes('CAF'))).toHaveLength(0);
  });

  test('standalone shell text is centered and readable at TV distance', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--idle'));
    await page.waitForLoadState('networkidle');

    // Idle story renders: "Wod.Wiki // waiting-for-cast"
    const title = page.locator('text=/waiting-for-cast/i');
    await expect(title).toBeVisible();

    const titleFontSize = await title.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(titleFontSize).toBeGreaterThanOrEqual(16);

    // Verify centering
    const parent = title.locator('..');
    const justifyContent = await parent.evaluate((el) =>
      window.getComputedStyle(el).justifyContent
    );
    expect(justifyContent).toBe('center');
  });

  test('web TV variant has no horizontal overflow at 1080p', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-amrap'));
    await page.waitForLoadState('networkidle');

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(pageWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});
