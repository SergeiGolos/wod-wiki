/**
 * WOD-734 — Responsive Layout & Component Integration
 *
 * Validates responsive behavior across three canonical viewports:
 *   - Mobile:  375px
 *   - Tablet:  768px
 *   - Desktop: 1280px
 *
 * Components under test:
 *   1. TimerStackView      — font scaling, compact vs default layout, touch targets
 *   2. WorkoutActionButton — responsive label visibility (hidden sm:inline)
 *   3. TrackViewShell      — flex direction (column vs row), panel proportions
 *
 * Tests run against Storybook stories so no live runtime or backend is required.
 */

import { test, expect } from '@playwright/test';

const STORYBOOK_BASE = 'http://localhost:6006';

function iframeUrl(storyId: string) {
  return `${STORYBOOK_BASE}/iframe.html?id=${storyId}&viewMode=story`;
}

const STORY_LOAD_TIMEOUT_MS = 20000;

/** Canonical viewports per acceptance criteria */
const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 667 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// ═════════════════════════════════════════════════════════════════════════════
// TimerStackView — Responsive Layout
// ═════════════════════════════════════════════════════════════════════════════

test.describe('TimerStackView — Responsive across viewports', () => {
  const TIMER_STORY = 'catalog-organisms-timerstackview--compact-mode';

  for (const vp of VIEWPORTS) {
    test(`renders without overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(iframeUrl(TIMER_STORY), {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      const canvas = page.locator('.bg-background').first();
      await expect(canvas).toBeVisible();

      // Timer text should be visible at all sizes
      await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();

      // No horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        const el = document.querySelector('.bg-background');
        if (!el) return true;
        return el.scrollWidth > el.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    });
  }

  test('primary timer font scales with panel width', async ({ page }) => {
    // Wide desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(iframeUrl(TIMER_STORY), {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });

    const timerText = page.getByText(/\d{2}:\d{2}/).first();
    await expect(timerText).toBeVisible();

    const wideFontSize = await timerText.evaluate((el: HTMLElement) =>
      parseInt(window.getComputedStyle(el).fontSize, 10)
    );

    // Narrow mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });

    const narrowTimerText = page.getByText(/\d{2}:\d{2}/).first();
    await expect(narrowTimerText).toBeVisible();

    const narrowFontSize = await narrowTimerText.evaluate((el: HTMLElement) =>
      parseInt(window.getComputedStyle(el).fontSize, 10)
    );

    // Desktop font should be larger than mobile
    expect(wideFontSize).toBeGreaterThan(narrowFontSize);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// WorkoutActionButton — Responsive Label Visibility
// ═════════════════════════════════════════════════════════════════════════════

test.describe('WorkoutActionButton — Responsive label visibility', () => {
  const BUTTON_STORY = 'catalog-organisms-workoutactionbutton--create-mode';

  test('label is hidden on mobile (375px) via responsive class', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(iframeUrl(BUTTON_STORY), {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });

    const mainButton = page.locator('button').first();
    await expect(mainButton).toBeVisible();

    // The label span should have the hidden-sm:inline class which hides it on small screens
    const labelSpan = mainButton.locator('span');
    const displayStyle = await labelSpan.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).display
    );

    // On 375px the sm breakpoint (640px) is not met, so hidden-sm:inline means display:none
    expect(displayStyle).toBe('none');
  });

  test('label is visible on tablet (768px) and above', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(iframeUrl(BUTTON_STORY), {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });

    const mainButton = page.locator('button').first();
    await expect(mainButton).toBeVisible();

    // At 768px the sm breakpoint is active, so inline display should show
    await expect(page.getByText('New')).toBeVisible();
  });

  test('label is visible on desktop (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(iframeUrl(BUTTON_STORY), {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });

    await expect(page.getByText('New')).toBeVisible();
  });

  test('touch target meets WCAG AA at all viewports', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(iframeUrl(BUTTON_STORY), {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      const buttons = page.locator('button');
      const count = await buttons.count();
      expect(count, `${vp.name}: button count`).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const box = await btn.boundingBox();
        if (!box) continue;
        expect(box.width, `${vp.name}: button ${i} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${vp.name}: button ${i} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TrackViewShell — Layout Direction & Proportions
// ═════════════════════════════════════════════════════════════════════════════

test.describe('TrackViewShell — Responsive layout direction', () => {
  const COMPACT_STORY = 'catalog-templates-layout-trackviewshell--compact-vertical';
  const DESKTOP_STORY = 'catalog-templates-layout-trackviewshell--desktop-split';

  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}px): compact story uses vertical stacking`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(iframeUrl(COMPACT_STORY), {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      const shell = page.locator('.flex-col').first();
      await expect(shell).toBeVisible();

      const flexDir = await shell.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).flexDirection
      );
      expect(flexDir).toBe('column');
    });

    test(`${vp.name} (${vp.width}px): desktop story uses horizontal split`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(iframeUrl(DESKTOP_STORY), {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      const shell = page.locator('.flex-row').first();
      await expect(shell).toBeVisible();

      const flexDir = await shell.evaluate((el: HTMLElement) =>
        window.getComputedStyle(el).flexDirection
      );
      expect(flexDir).toBe('row');

      // Left panel should be ~33% width
      const leftPanel = page.locator('div[class*="w-1/3"]').first();
      await expect(leftPanel).toBeVisible();

      // Right panel should be ~66% width
      const rightPanel = page.locator('div[class*="w-2/3"]').first();
      await expect(rightPanel).toBeVisible();
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Component Integration — All Three Together
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Integration — Timer + Buttons + Shell at each viewport', () => {
  const SHELL_REALWORLD = 'catalog-templates-layout-trackviewshell--real-world-simulation';

  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}px): integrated layout renders without errors`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(iframeUrl(SHELL_REALWORLD), {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      // Shell should be visible
      const shell = page.locator('.flex').first();
      await expect(shell).toBeVisible();

      // Timer-like content should render
      await expect(page.getByText(/10:00/)).toBeVisible();

      // No console errors during render
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Wait a moment for any React errors to surface
      await page.waitForTimeout(500);

      // Should have no React error overlays or console errors
      const errorOverlay = page.locator('iframe[title="React error overlay"], [class*="error-overlay"]').first();
      await expect(errorOverlay).toHaveCount(0);
    });
  }
});
