import { Page, Locator, expect } from '@playwright/test';

/** YYYY-MM-DD helper */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export { localDateKey };

export class JournalPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto(dateKey?: string) {
    const url = dateKey ? `/journal?s=${dateKey}` : '/journal';
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForReady();
  }

  /** Wait until at least one date group is rendered and the mount scroll settles. */
  async waitForReady() {
    await this.page.waitForSelector('[data-testid="journal-date-scroll"]', { timeout: 10_000 });
    await this.page.waitForSelector('[data-testid="top-sentinel"]', { timeout: 5_000 });
    // Wait for mount scroll to complete (suppressReportRef releases on scrollend / stability poll)
    await this.page.waitForTimeout(700);
  }

  // ── Sentinels ─────────────────────────────────────────────────────────────

  topSentinel(): Locator {
    return this.page.locator('[data-testid="top-sentinel"]');
  }

  bottomSentinel(): Locator {
    return this.page.locator('[data-testid="bottom-sentinel"]');
  }

  // ── Date groups ───────────────────────────────────────────────────────────

  /** Locator for a specific date group by key (YYYY-MM-DD). */
  dateGroup(key: string): Locator {
    return this.page.locator(`[data-testid="journal-date-scroll"] [id="${key}"]`);
  }

  /** All rendered date group IDs in DOM order (descending = newest first). */
  async allDateKeys(): Promise<string[]> {
    return this.page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="journal-date-scroll"]');
      if (!scroll) return [];
      return Array.from(scroll.querySelectorAll('[id]'))
        .map(el => el.id)
        .filter(id => /^\d{4}-\d{2}-\d{2}$/.test(id));
    });
  }

  /** The first (newest) date key in the current window. */
  async firstDateKey(): Promise<string> {
    const keys = await this.allDateKeys();
    return keys[0] ?? '';
  }

  /** The last (oldest) date key in the current window. */
  async lastDateKey(): Promise<string> {
    const keys = await this.allDateKeys();
    return keys[keys.length - 1] ?? '';
  }

  // ── Ghost rows ────────────────────────────────────────────────────────────

  planWorkoutButton(key: string): Locator {
    return this.dateGroup(key).getByRole('button', { name: '+ Plan a workout' });
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  /** Instant-jump to the top-sentinel (triggers past-load without scroll animation). */
  async jumpToTop() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await this.page.waitForTimeout(1500);
  }

  /** Instant-jump to the bottom-sentinel (triggers future-load). */
  async jumpToBottom() {
    await this.page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    );
    await this.page.waitForTimeout(1500);
  }

  /** Scroll a specific date group to near the top of the viewport (below sticky header). */
  async scrollGroupToTop(key: string) {
    await this.page.evaluate((k) => {
      const el = document.getElementById(k);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, key);
    await this.page.waitForTimeout(400);
  }

  /** Return the current window.scrollY. */
  async scrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  /** Return the viewport-relative bounding rect of an element. */
  async viewportRect(locator: Locator) {
    return locator.evaluate(el => {
      const { top, bottom, left, right, width, height } = el.getBoundingClientRect();
      return { top, bottom, left, right, width, height };
    });
  }

  // ── URL helpers ───────────────────────────────────────────────────────────

  /** Return the current selected-date param from the URL. */
  currentDateParam(): string | null {
    const url = new URL(this.page.url());
    return url.searchParams.get('s');
  }

  /** Wait until the selected-date param stabilises on a given value for two consecutive 200ms checks. */
  async waitForDateParam(expectedKey: string, timeout = 3000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (this.currentDateParam() === expectedKey) {
        await this.page.waitForTimeout(200);
        if (this.currentDateParam() === expectedKey) return;
      }
      await this.page.waitForTimeout(100);
    }
    throw new Error(`Timed out waiting for selected date ${expectedKey}; current: ${this.currentDateParam()}`);
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectDateInViewport(key: string) {
    const group = this.dateGroup(key);
    await expect(group).toBeVisible();
    const rect = await this.viewportRect(group);
    const vh = this.page.viewportSize()?.height ?? 768;
    expect(rect.bottom, `Date group ${key} bottom should be > 0`).toBeGreaterThan(0);
    expect(rect.top, `Date group ${key} top should be < viewport height`).toBeLessThan(vh);
  }

  /** Assert the date is roughly centered — its midpoint is within ±40% of the viewport center. */
  async expectDateCenteredInViewport(key: string) {
    const group = this.dateGroup(key);
    await expect(group).toBeVisible();
    const rect = await this.viewportRect(group);
    const vh = this.page.viewportSize()?.height ?? 768;
    const groupMid = (rect.top + rect.bottom) / 2;
    const viewportCenter = vh / 2;
    const tolerance = vh * 0.4;
    expect(
      Math.abs(groupMid - viewportCenter),
      `Date group ${key} midpoint (${groupMid.toFixed(0)}) should be within ${tolerance.toFixed(0)}px of viewport center (${viewportCenter.toFixed(0)})`,
    ).toBeLessThan(tolerance);
  }

  async expectDescendingOrder() {
    const keys = await this.allDateKeys();
    expect(keys.length, 'Should have at least 2 date groups').toBeGreaterThanOrEqual(2);
    for (let i = 1; i < keys.length; i++) {
      expect(
        keys[i]! < keys[i - 1]!,
        `Keys must be in strict descending order at index ${i}: "${keys[i - 1]}" should be > "${keys[i]}"`,
      ).toBe(true);
    }
  }
}
