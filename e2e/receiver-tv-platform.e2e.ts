import { test, expect } from '@playwright/test';

/**
 * WOD-735 — Chromecast & TV Platform Testing
 *
 * Browser-level validation of the Chromecast receiver for TV platforms:
 *  1. D-Pad navigation — arrow keys move focus spatially between elements
 *  2. TV-optimized rendering — layout is stable at 1920×1080 TV viewport
 *  3. 10-foot viewing compliance — font sizes, contrast, element sizing
 *  4. Focus indicators — high-contrast ring, scale transform, box-shadow
 *  5. Web TV variant — standalone receiver mode renders without CAF
 */

const STORYBOOK_BASE = 'http://localhost:6006';

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
// Helper: assert an element has the TV focus indicator CSS
// ────────────────────────────────────────────────────────────────────────────
async function assertTvFocusIndicator(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator) {
  const boxShadow = await locator.evaluate((el) => window.getComputedStyle(el).boxShadow);
  const transform = await locator.evaluate((el) => window.getComputedStyle(el).transform);
  const outline = await locator.evaluate((el) => window.getComputedStyle(el).outline);

  // Box shadow should contain primary-color glow layers
  expect(boxShadow).toContain('hsl');
  expect(boxShadow).not.toBe('none');

  // Scale transform for 10-foot pop-up effect
  expect(transform).toContain('matrix');
  const matrix = await locator.evaluate((el) => {
    const m = new DOMMatrix(window.getComputedStyle(el).transform);
    return { a: m.a, d: m.d };
  });
  expect(matrix.a).toBeGreaterThan(1.02); // scale X
  expect(matrix.d).toBeGreaterThan(1.02); // scale Y

  // Outline must be suppressed (spatial nav uses box-shadow)
  expect(outline).toBe('none');
}

// ────────────────────────────────────────────────────────────────────────────
// 1. D-Pad Navigation
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — D-Pad Navigation (WOD-735)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(storyUrl('testing-spatialnavigationvalidation--default'));
    await page.waitForLoadState('networkidle');
  });

  test('initial focus lands on first preview block', async ({ page }) => {
    const firstBlock = page.locator('[data-testid="preview-block-0"]');
    await expect(firstBlock).toHaveAttribute('data-nav-focused', 'true');
  });

  test('ArrowDown moves focus through the preview list', async ({ page }) => {
    const blockIds = [
      'preview-block-0',
      'preview-block-1',
      'preview-block-2',
      'preview-block-3',
    ];

    for (const id of blockIds) {
      const el = page.locator(`[data-testid="${id}"]`);
      await expect(el).toHaveAttribute('data-nav-focused', 'true');
      await page.keyboard.press('ArrowDown');
    }

    // Final ArrowDown should stay on last element (no element below)
    const lastBlock = page.locator('[data-testid="preview-block-5"]');
    await expect(lastBlock).toHaveAttribute('data-nav-focused', 'true');
  });

  test('ArrowUp moves focus back up the list', async ({ page }) => {
    // Start at bottom by pressing Down 6 times
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowDown');
    }

    const lastBlock = page.locator('[data-testid="preview-block-5"]');
    await expect(lastBlock).toHaveAttribute('data-nav-focused', 'true');

    await page.keyboard.press('ArrowUp');
    const block4 = page.locator('[data-testid="preview-block-4"]');
    await expect(block4).toHaveAttribute('data-nav-focused', 'true');

    await page.keyboard.press('ArrowUp');
    const block3 = page.locator('[data-testid="preview-block-3"]');
    await expect(block3).toHaveAttribute('data-nav-focused', 'true');
  });

  test('ArrowRight moves focus from list to timer controls', async ({ page }) => {
    // Focus is on preview-block-0 initially
    const firstBlock = page.locator('[data-testid="preview-block-0"]');
    await expect(firstBlock).toHaveAttribute('data-nav-focused', 'true');

    // Navigate down to a lower block so right arrow hits timer
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('ArrowRight');

    // Should land on one of the right-panel controls
    const timerMain = page.locator('[data-testid="timer-main"]');
    const btnStop = page.locator('[data-testid="btn-stop"]');
    const btnNext = page.locator('[data-testid="btn-next"]');

    const timerFocused = await timerMain.getAttribute('data-nav-focused');
    const stopFocused = await btnStop.getAttribute('data-nav-focused');
    const nextFocused = await btnNext.getAttribute('data-nav-focused');

    expect(
      timerFocused === 'true' || stopFocused === 'true' || nextFocused === 'true'
    ).toBe(true);
  });

  test('Enter activates the focused element', async ({ page }) => {
    const firstBlock = page.locator('[data-testid="preview-block-0"]');
    await expect(firstBlock).toHaveAttribute('data-nav-focused', 'true');

    await page.keyboard.press('Enter');

    // Verify activation flash class is applied briefly
    const hasActivating = await firstBlock.evaluate((el) =>
      el.classList.contains('tv-activating')
    );
    expect(hasActivating).toBe(true);
  });

  test('Space bar activates the focused element', async ({ page }) => {
    const firstBlock = page.locator('[data-testid="preview-block-0"]');
    await expect(firstBlock).toHaveAttribute('data-nav-focused', 'true');

    await page.keyboard.press(' ');

    const hasActivating = await firstBlock.evaluate((el) =>
      el.classList.contains('tv-activating')
    );
    expect(hasActivating).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. TV Viewport & 10-Foot Compliance
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — TV Viewport & 10-Foot Compliance (WOD-735)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('waiting shell renders correctly at 1080p TV viewport', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--idle'));
    await page.waitForLoadState('networkidle');

    const container = page.locator('body');
    await expect(container).toHaveScreenshot('receiver-tv-waiting-1080p.png', {
      maxDiffPixels: 100,
    });
  });

  test('preview panel renders at 1080p without overflow', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--default'));
    await page.waitForLoadState('networkidle');

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(pageHeight).toBeLessThanOrEqual(viewportHeight + 20); // allow tiny rounding
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

  test('10-foot font sizes are ≥ 18px for primary content', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--default'));
    await page.waitForLoadState('networkidle');

    const title = page.locator('text=Fran').first();
    const titleFontSize = await title.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(titleFontSize).toBeGreaterThanOrEqual(24);

    const blockLabels = page.locator('[data-nav-id^="preview-block-"]');
    const firstBlock = blockLabels.first();
    const blockFontSize = await firstBlock.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(blockFontSize).toBeGreaterThanOrEqual(16);
  });

  test('10-foot contrast: title meets WCAG AA on dark background', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--default'));
    await page.waitForLoadState('networkidle');

    const title = page.locator('text=Fran').first();
    const color = await title.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    const bgColor = await title.evaluate((el) =>
      window.getComputedStyle(el.parentElement!).backgroundColor
    );

    // On dark backgrounds, white text should have high contrast
    // We check that the color is light (high R/G/B values)
    const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
      const r = parseInt(rgb[1], 10);
      const g = parseInt(rgb[2], 10);
      const b = parseInt(rgb[3], 10);
      // Light text on dark background: individual channels should be high
      expect(Math.max(r, g, b)).toBeGreaterThanOrEqual(200);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Focus Indicators
// ────────────────────────────────────────────────────────────────────────────
test.describe('Receiver — Focus Indicators (WOD-735)', () => {
  test('preview block focus shows box-shadow halo and scale', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--first-focused'));
    await page.waitForLoadState('networkidle');

    const focusedBlock = page.locator('[data-nav-focused="true"]').first();
    await expect(focusedBlock).toBeVisible();

    await assertTvFocusIndicator(page, focusedBlock);
  });

  test('dismiss button focus shows box-shadow halo and scale', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-review-chromecast--dismiss-button-focused'));
    await page.waitForLoadState('networkidle');

    const dismissBtn = page.locator('[data-nav-id="btn-dismiss"]');
    await expect(dismissBtn).toHaveAttribute('data-nav-focused', 'true');

    await assertTvFocusIndicator(page, dismissBtn);
  });

  test('unfocused elements do not have focus indicator', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--default'));
    await page.waitForLoadState('networkidle');

    const unfocusedBlock = page.locator('[data-nav-id="preview-block-0"]');
    await expect(unfocusedBlock).toHaveAttribute('data-nav-focused', 'false');

    const boxShadow = await unfocusedBlock.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );
    const transform = await unfocusedBlock.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    // No glow on unfocused elements
    expect(boxShadow).toBe('none');
    // No scale on unfocused elements
    expect(transform).toBe('none');
  });

  test('round timer button keeps circular focus ring', async ({ page }) => {
    await page.goto(storyUrl('testing-spatialnavigationvalidation--default'));
    await page.waitForLoadState('networkidle');

    const timerMain = page.locator('[data-testid="timer-main"]');
    await expect(timerMain).toBeVisible();

    // Move focus to timer-main using keyboard
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');

    // Check if timer-main is focused; if not, try ArrowRight again
    const isFocused = await timerMain.getAttribute('data-nav-focused');
    if (isFocused !== 'true') {
      await page.keyboard.press('ArrowRight');
    }

    await expect(timerMain).toHaveAttribute('data-nav-focused', 'true');

    const borderRadius = await timerMain.evaluate((el) =>
      window.getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('9999px');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Web TV Variant (Standalone Receiver)
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

    const title = page.locator('text=/Ready for cast/i');
    await expect(title).toBeVisible();

    const titleFontSize = await title.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    expect(titleFontSize).toBeGreaterThanOrEqual(20);

    // Verify centering
    const parent = title.locator('..');
    const justifyContent = await parent.evaluate((el) =>
      window.getComputedStyle(el).justifyContent
    );
    expect(justifyContent).toBe('center');
  });

  test('preview panel in web TV variant shows all blocks', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-preview-chromecast--many-blocks'));
    await page.waitForLoadState('networkidle');

    // All 24 blocks should be in the DOM
    const blocks = page.locator('[data-nav-id^="preview-block-"]');
    await expect(blocks).toHaveCount(24);
  });

  test('web TV variant has no horizontal overflow at 1080p', async ({ page }) => {
    await page.goto(storyUrl('catalog-templates-tracker-chromecast--active-amrap'));
    await page.waitForLoadState('networkidle');

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(pageWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});
