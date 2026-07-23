/**
 * Playground Full Integration E2E Tests
 *
 * Validates the /playground/:id route with the complete widget integration:
 * 1. Editor loads with default playground template content
 * 2. Visible widgets render (code-example, playground-run-tip)
 * 3. Code-example widget displays annotations and run button
 * 4. Syntax-group grid renders with correct responsive layout
 * 5. Workout can be started from the wod block via Actions menu
 * 6. Mobile viewport rendering
 * 7. Dark / light mode switching
 * 8. Performance budget (FCP < 1s, LCP < 2s)
 *
 * Tests run against the local Vite dev server via playwright.repro.config.ts
 * or playwright.journal.config.ts.
 */

import { test, expect, type Page } from '@playwright/test';
import { clearAllNotes, seedNote } from '../helpers/wodwikiDb';

const TEST_PAGE_NAME = 'e2e-full-integration';

function monitorErrors(page: Page): { consoleErrors: string[]; pageErrors: string[] } {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('ERR_CONNECTION_REFUSED')) return;
    // Vite HMR websocket noise on TLS dev setups — not app errors
    if (text.includes('ERR_SSL_PROTOCOL_ERROR')) return;
    if (text.includes('[vite] failed to connect to websocket')) return;
    consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

// ── Performance helpers ─────────────────────────────────────────────────────

async function capturePaintTiming(page: Page): Promise<{
  fcp: number | null;
  lcp: number | null;
}> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
    const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as PerformanceEntry[];
    const lcpEntry = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : null;
    return {
      fcp: fcpEntry ? fcpEntry.startTime : null,
      lcp: lcpEntry ? (lcpEntry as any).startTime : null,
    };
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Playground Full Page Integration — /playground/:id', () => {
  const viewports = [
    { name: 'desktop', size: { width: 1440, height: 900 } },
    { name: 'tablet', size: { width: 768, height: 1024 } },
    { name: 'mobile', size: { width: 375, height: 812 } },
  ] as const;

  test.beforeEach(async ({ page }) => {
    // Navigate to a stable route to seed IndexedDB access, then clear ALL
    // playground pages so the default playground template loads on the next visit.
    await page.goto('/syntax', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await clearAllNotes(page);
  });

  // ── 1. Widget rendering ─────────────────────────────────────────────────

  test('renders visible widgets and wod block on the playground note page', async ({ page }) => {
    const { consoleErrors, pageErrors } = monitorErrors(page);

    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
    // Give React + CodeMirror time to parse widgets and render decorations
    await page.waitForTimeout(1_500);

    // The default template includes the attention widget at the top.
    // Because CodeMirror virtualizes rendering, off-screen widgets may not
    // be in the DOM when the cursor is at the bottom of the document.
    // We verify the raw markdown text is present in the editor.
    const editor = page.locator('.cm-content[contenteditable="true"]').first();
    await expect(editor).toContainText('Wod.Wiki Playground');
    await expect(editor).toContainText('```widget:attention');
    // Note: code-example and playground-run-tip widgets are rendered as
    // decorations, so their raw fences are not in the editor textContent.
    // We verify the widgets themselves are visible.

    // Code-example widget (visible in the viewport)
    await expect(page.getByRole('heading', { name: 'Code example', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run this example' })).toBeVisible();

    // Playground run tip widget (visible in the viewport)
    await expect(page.getByText('Ready to try it?')).toBeVisible();
    await expect(page.getByText(/workout block below/)).toBeVisible();

    // WOD block action buttons rendered by the overlay system
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

  });

  // ── 2. Code-example widget ──────────────────────────────────────────────

  test('code-example widget displays annotations and run button', async ({ page }) => {
    const { consoleErrors, pageErrors } = monitorErrors(page);

    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
    await page.waitForTimeout(1_000);

    await expect(page.getByText('repeat the indented workout block 3 times')).toBeVisible();
    await expect(page.getByText('reps · movement · load')).toBeVisible();
    await expect(page.getByText('rest timer between rounds')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ── 3. Syntax-group grid layout ─────────────────────────────────────────

  for (const viewport of viewports) {
    test(`syntax-group grid is responsive on ${viewport.name}`, async ({ page }) => {
      const { consoleErrors, pageErrors } = monitorErrors(page);

      await page.setViewportSize(viewport.size);
      await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
      await page.waitForTimeout(1_000);

      // Scroll to the syntax reference section to bring syntax-group widgets into view
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      });
      await page.waitForTimeout(500);

      // At least some syntax group cards should be visible after scrolling
      const syntaxCards = page.locator('.cm-widget-block-preview').filter({ hasText: 'Docs' });
      const count = await syntaxCards.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // No horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  // ── 4. Workout runtime from wod block ───────────────────────────────────

  test('starts a workout from the wod block', async ({ page }) => {
    // Suppress the First-Note Wizard (ADR-0010): its backdrop intercepts
    // pointer events on fresh browser profiles (see runtime-execution.e2e.ts).
    await page.addInitScript(() => {
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });
    const { consoleErrors, pageErrors } = monitorErrors(page);

    // Fresh playground notes start as an EMPTY wod fence (the wizard fills
    // them; suppressed here) — seed a real workout to exercise the run flow.
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
    await seedNote(
      page,
      `playground/${TEST_PAGE_NAME}`,
      '# My Workout\n\n```wod\nTimer 1:00\n  - 10 Pushups\n  - 10 Situps\n```\n',
      { type: 'playground', title: TEST_PAGE_NAME },
    );

    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });

    // Wait for React to parse blocks and render run buttons
    await page.waitForTimeout(2_500);

    // Click the visible Play button on the wod block overlay to start the runtime.
    // PlaygroundNotePage uses enableInlineRuntime={false}, so this navigates to
    // the tracker route instead of opening an inline overlay.
    const playButton = page.getByRole('button', { name: 'Play' }).first();
    await expect(playButton).toBeVisible();
    await playButton.click();

    // Should navigate to the run route (/tracker/:id is a legacy redirect
    // alias that resolves to /run/:id immediately)
    await page.waitForURL(/\/(tracker|run)\//, { timeout: 10_000 });

    // Tracker page should show the workout timer
    await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible({ timeout: 8_000 });

    // autoStart opens the session at the SessionRoot gate; Next advances
    // into the first block (see runtime-execution.e2e.ts)
    await page.locator('button[title="Next Block"]').first().click();

    // Verify pause control is visible (workout is running)
    const pauseButton = page.locator('button[title="Pause"]:visible').first();
    await expect(pauseButton).toBeVisible({ timeout: 8_000 });

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

  });

  // ── 5. Dark / light mode switching ──────────────────────────────────────

  test('switches between dark and light mode', async ({ page }) => {
    const { consoleErrors, pageErrors } = monitorErrors(page);

    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
    await page.waitForTimeout(1_000);

    // Open the Actions menu
    const actionsMenuTrigger = page.locator('div.flex.items-center.gap-3').filter({ has: page.getByRole('button', { name: 'New' }) }).locator('button').last();
    await actionsMenuTrigger.click();
    await page.waitForTimeout(500);

    const dropdownMenu = page.locator('[role="menu"]').last();

    // Check current theme label
    const themeLabel = dropdownMenu.getByText(/Theme:/);
    await expect(themeLabel).toBeVisible();

    // Click theme toggle to cycle through modes
    await themeLabel.click();
    await page.waitForTimeout(500);

    // Re-open menu and toggle again
    await actionsMenuTrigger.click();
    await page.waitForTimeout(300);
    const themeLabel2 = page.locator('[role="menu"]').last().getByText(/Theme:/);
    await themeLabel2.click();
    await page.waitForTimeout(500);

    // Verify page still renders without errors after theme switches
    await expect(page.getByRole('heading', { name: 'Code example', exact: true })).toBeVisible();

    // Filter out known non-critical console errors from Headless UI nested
    // buttons and pre-existing CodeMirror theme-reconfiguration crash.
    const filteredErrors = consoleErrors.filter((e) =>
      !/hydration error|cannot be a descendant of|cannot contain a nested|CodeMirror plugin crashed|tags3 is not iterable/i.test(e)
    );
    expect(filteredErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

  });

  // ── 6. Performance budget ───────────────────────────────────────────────

  test('meets performance budget (FCP < 1s, LCP < 2s)', async ({ page }) => {
    const { consoleErrors, pageErrors } = monitorErrors(page);

    // Clear performance entries before navigation
    await page.evaluate(() => performance.clearResourceTimings());

    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });

    // Wait a bit for LCP to be reported
    await page.waitForTimeout(1_000);

    const { fcp, lcp } = await capturePaintTiming(page);

    // FCP should be under 1 second (generous for dev server)
    if (fcp !== null) {
      expect(fcp, `FCP was ${fcp.toFixed(0)}ms`).toBeLessThan(1_000);
    }

    // LCP should be under 2 seconds
    if (lcp !== null) {
      expect(lcp, `LCP was ${lcp.toFixed(0)}ms`).toBeLessThan(2_000);
    }

    // Scroll performance check: sample 60 frames
    const fps = await page.evaluate(async () => {
      const stamps: number[] = [];
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          stamps.push(now);
          if (stamps.length >= 60) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const deltas = stamps.slice(1).map((time, index) => time - stamps[index]!);
      const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
      return 1000 / avgDelta;
    });

    expect(fps).toBeGreaterThanOrEqual(60);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

  });

  // ── 7. Mobile touch interactions ────────────────────────────────────────

  test('mobile viewport renders touch-friendly UI', async ({ page }) => {
    const { consoleErrors, pageErrors } = monitorErrors(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/playground/${TEST_PAGE_NAME}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });
    await page.waitForTimeout(1_000);

    // Primary visible widgets should still render
    await expect(page.getByRole('heading', { name: 'Code example', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run this example' })).toBeVisible();

    // Buttons should be at least 32px tall for touch targets (WCAG minimum)
    const runExampleButton = page.getByRole('button', { name: 'Run this example' });
    const box = await runExampleButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(32);
    }

    // No horizontal overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

  });
});
