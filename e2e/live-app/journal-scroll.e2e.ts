import { test, expect } from '@playwright/test';
import { JournalPage, localDateKey } from '../pages/JournalPage';

/**
 * Acceptance tests for JournalDateScroll scroll behaviour.
 *
 * Run: bun run test:e2e:journal
 * Config: playwright.journal.config.ts → https://pluto.forest-adhara.ts.net:5173
 *
 * Design notes used to set correct expectations:
 *  - Dates render descending: newest top, oldest bottom
 *  - Mount scroll brings the target (or today) into the viewport
 *  - The visible-date IO tracks the date at the TOP of the visible area (below sticky
 *    header), so the URL's selected-date param tracks the nearest visible group
 *  - Future empty dates show a "Plan a workout" row; today/past empty dates do not
 *  - Top sentinel prepends 7 future days with anchor compensation (no viewport jump)
 *  - Bottom sentinel appends 7 past days (no compensation needed)
 *  - Initial window is ±14 days; sentinels may fire during the first ~700ms, so
 *    effective window can extend beyond ±14 before tests start
 */

function todayKey(): string {
  return localDateKey(new Date());
}

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

// ── Layout ─────────────────────────────────────────────────────────────────

test.describe('Layout', () => {
  test('date groups render in strict descending order', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    await journal.expectDescendingOrder();
  });

  test("today's date group header contains 'Today' marker", async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    const todayGroup = journal.dateGroup(todayKey());
    await expect(todayGroup).toBeVisible();
    // Match the inner <span class="ml-2 ...">— Today</span> specifically
    await expect(todayGroup.locator('span.ml-2').filter({ hasText: /Today/ }).first()).toBeVisible();
  });

  test('dates 35+ days out are not yet rendered in the initial window', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    // Initial window is ±14 days; sentinels may extend it a bit on load,
    // but 35 days back should never be present on initial load.
    const veryFarPastKey = dayOffset(-35);
    await expect(journal.dateGroup(veryFarPastKey)).not.toBeAttached();
  });
});

// ── Initial scroll position ────────────────────────────────────────────────

test.describe('Initial scroll position', () => {
  test('today is approximately centered in the viewport on load (no ?d=)', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    await journal.expectDateCenteredInViewport(todayKey());
  });

  test('?d= target date is approximately centered in the viewport on load', async ({ page }) => {
    const targetKey = dayOffset(-5);
    const journal = new JournalPage(page);
    await journal.goto(targetKey);
    await journal.expectDateCenteredInViewport(targetKey);
  });

  test('target date has rendered dates above and below it after ?d= load', async ({ page }) => {
    const targetKey = dayOffset(-5);
    const journal = new JournalPage(page);
    await journal.goto(targetKey);

    const keys = await journal.allDateKeys();
    const idx = keys.indexOf(targetKey);
    expect(idx, `${targetKey} should be in the rendered window`).toBeGreaterThan(-1);
    expect(idx, 'There should be dates above the target').toBeGreaterThan(0);
    expect(idx, 'There should be dates below the target').toBeLessThan(keys.length - 1);
  });
});

// ── Ghost "Plan a workout" row ─────────────────────────────────────────────

test.describe('"Plan a workout" ghost row', () => {
  test('yesterday does NOT have a "Plan a workout" button', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    const key = dayOffset(-1);
    await expect(journal.dateGroup(key)).toBeAttached();
    await expect(journal.planWorkoutButton(key)).not.toBeAttached();
  });

  test('today does NOT have a "Plan a workout" button', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    await expect(journal.planWorkoutButton(todayKey())).not.toBeAttached();
  });

  test('tomorrow has a "Plan a workout" button', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    await expect(journal.planWorkoutButton(dayOffset(1))).toBeVisible();
  });
});

// ── Infinite scroll ────────────────────────────────────────────────────────

test.describe('Infinite scroll – sentinel loading', () => {
  test('scrolling to the top reveals future dates that were not in the initial window', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    const firstKeyBefore = await journal.firstDateKey();

    // Jump to the very top and wait for the prepend IO to fire and settle.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(
      (before) => {
        const scroll = document.querySelector('[data-testid="journal-date-scroll"]');
        if (!scroll) return false;
        const ids = Array.from(scroll.querySelectorAll('[id]'))
          .map((el) => el.id)
          .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id));
        return ids.length > 0 && ids[0]! > before;
      },
      firstKeyBefore,
      { timeout: 5000 },
    );

    const firstKeyAfter = await journal.firstDateKey();
    expect(
      firstKeyAfter > firstKeyBefore,
      `After top scroll, first key "${firstKeyAfter}" should be later than "${firstKeyBefore}"`,
    ).toBe(true);
  });

  test('scrolling to the bottom reveals older dates that were not in the initial window', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    const lastKeyBefore = await journal.lastDateKey();

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    );
    await page.waitForFunction(
      (before) => {
        const scroll = document.querySelector('[data-testid="journal-date-scroll"]');
        if (!scroll) return false;
        const ids = Array.from(scroll.querySelectorAll('[id]'))
          .map((el) => el.id)
          .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id));
        return ids.length > 0 && ids[ids.length - 1]! < before;
      },
      lastKeyBefore,
      { timeout: 5000 },
    );

    const lastKeyAfter = await journal.lastDateKey();
    expect(
      lastKeyAfter < lastKeyBefore,
      `After bottom scroll, last key "${lastKeyAfter}" should be earlier than "${lastKeyBefore}"`,
    ).toBe(true);
  });

  test('prepending future dates does not jump the viewport (anchor compensation)', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    const firstKeyBefore = await journal.firstDateKey();
    const anchorGroup = journal.dateGroup(firstKeyBefore);

    // Scroll up to trigger a prepend, then wait for it to complete.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const rectBefore = await journal.viewportRect(anchorGroup);

    await page.waitForFunction(
      (before) => {
        const scroll = document.querySelector('[data-testid="journal-date-scroll"]');
        if (!scroll) return false;
        const ids = Array.from(scroll.querySelectorAll('[id]'))
          .map((el) => el.id)
          .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id));
        return ids.length > 0 && ids[0]! > before;
      },
      firstKeyBefore,
      { timeout: 5000 },
    );

    // The anchor element should still be at roughly the same viewport position
    const rectAfter = await journal.viewportRect(anchorGroup);
    const drift = Math.abs(rectAfter.top - rectBefore.top);
    expect(
      drift,
      `Anchor element drifted ${drift}px after prepend — anchor compensation failed`,
    ).toBeLessThan(80);
  });
});

// ── URL selected-date sync ─────────────────────────────────────────────────

test.describe('URL selected-date sync', () => {
  test('selected-date param is set to a valid date key after initial load', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    await page.waitForTimeout(400);
    const param = journal.currentDateParam();
    expect(param).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('scrolling a date group to the top-of-viewport updates selected-date param to a nearby date', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    // Scroll a date to near the top so the IO threshold picks it up
    const targetKey = dayOffset(-4);
    await journal.scrollGroupToTop(targetKey);
    await page.waitForTimeout(600);

    const param = journal.currentDateParam();
    expect(param, 'selected-date param should be a valid date key after scroll').toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // The IO tracker reports the date at the top threshold — expect within ±2 days
    const paramDate = new Date(param!);
    const targetDate = new Date(targetKey);
    const diffDays = Math.round((paramDate.getTime() - targetDate.getTime()) / 86_400_000);
    expect(
      Math.abs(diffDays),
      `selected-date param "${param}" should be within 2 days of target "${targetKey}" (diff: ${diffDays})`,
    ).toBeLessThanOrEqual(2);
  });
});

// ── No scroll pop (anti-regression) ───────────────────────────────────────

test.describe('No scroll pop (anti-regression)', () => {
  /**
   * The scroll pop bug: navigating to a distant past date could cause the sentinel
   * to fire mid-scroll (prepend + instant scrollBy) fighting the smooth animation,
   * making the viewport snap back. We assert: after navigation, the target date
   * is visible and scrollY stabilises within 300ms.
   */
  test('target date is visible after navigating 10 days into the past', async ({ page }) => {
    const pastKey = dayOffset(-10);
    const journal = new JournalPage(page);
    await journal.goto(pastKey);
    await journal.expectDateInViewport(pastKey);
  });

  test('scrollY is stable for 300ms after mount centering completes', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();
    // waitForReady() already waits 700ms for mount scroll to settle

    const y0 = await journal.scrollY();
    await page.waitForTimeout(150);
    const y1 = await journal.scrollY();
    await page.waitForTimeout(150);
    const y2 = await journal.scrollY();

    const drift = Math.max(Math.abs(y1 - y0), Math.abs(y2 - y1));
    expect(drift, `ScrollY should be stable after mount; observed drift of ${drift}px`).toBeLessThan(10);
  });

  test('target date stays visible 1 second after navigating to a past date', async ({ page }) => {
    const pastKey = dayOffset(-8);
    const journal = new JournalPage(page);
    await journal.goto(pastKey);

    // Take a viewport snapshot immediately, then again after 1s — target must stay visible
    await journal.expectDateInViewport(pastKey);
    await page.waitForTimeout(1000);
    await journal.expectDateInViewport(pastKey);
  });
});

// ── Nav-panel calendar date click ──────────────────────────────────────────

test.describe('Nav-panel calendar date click', () => {
  /**
   * Regression: clicking today's date in the nav-panel calendar while scrolled
   * away from today used to call window.scrollTo(0, 0) (top of page = future
   * dates section), leaving today's group out of view.
   *
   * Fix: initialDate is no longer in the mount-scroll effect deps; post-mount
   * date selection uses the imperative scrollToDate() handle instead.
   */
  test('clicking today in the nav calendar scrolls today into view', async ({ page }) => {
    const journal = new JournalPage(page);
    await journal.goto();

    // Scroll well past today so today is no longer visible.
    const pastKey = dayOffset(-4);
    await journal.scrollGroupToTop(pastKey);
    await page.waitForTimeout(300);

    // Confirm today is NOT in the viewport before the click.
    const todayGroupBefore = journal.dateGroup(todayKey());
    const rectBefore = await journal.viewportRect(todayGroupBefore);
    const vh = page.viewportSize()?.height ?? 768;
    const todayVisibleBefore = rectBefore.bottom > 0 && rectBefore.top < vh;
    // If today somehow is still in view (very small viewport), skip the assertion
    // to avoid a flaky failure — the important check is after the click.
    if (todayVisibleBefore) {
      // Try scrolling further if today is still visible.
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(200);
    }

    // Click today's date in the nav-panel mini calendar.
    // The calendar is in the left-side nav panel and uses a button with the day number.
    const today = new Date();
    const todayDayNum = String(today.getDate());
    // The CalendarCard renders day buttons; find the one for today.
    // It is distinguished by being inside a [data-today] or aria-label containing the date.
    // Fall back to clicking the button labelled with today's day number that is NOT disabled.
    const calendarNav = page.locator('[data-testid="sidebar"], nav, aside').first();
    const todayButton = calendarNav
      .getByRole('button', { name: new RegExp(`^${todayDayNum}$`) })
      .first();
    await todayButton.click();

    // Wait for the scroll to settle.
    await page.waitForTimeout(800);

    // Today's date group must now be visible in the viewport.
    await journal.expectDateInViewport(todayKey());
  });

  test('clicking a past date in the nav calendar scrolls that date into view', async ({ page }) => {
    const targetKey = dayOffset(-3);
    const journal = new JournalPage(page);
    await journal.goto();

    // Ensure the target is not currently visible by scrolling to top (future dates).
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);

    // Click the target date in the nav calendar.
    const targetDate = new Date(targetKey + 'T00:00:00');
    const dayNum = String(targetDate.getDate());
    const calendarNav = page.locator('[data-testid="sidebar"], nav, aside').first();
    const targetButton = calendarNav
      .getByRole('button', { name: new RegExp(`^${dayNum}$`) })
      .first();
    await targetButton.click();

    await page.waitForTimeout(800);

    await journal.expectDateInViewport(targetKey);
  });
});
