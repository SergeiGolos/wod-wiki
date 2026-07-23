import { Page, Locator, expect } from '@playwright/test';

/**
 * ReviewPage — Page Object for /review/:runtimeId
 *
 * A full-screen takeover (FocusedDialog + FullscreenReview) that renders the
 * workout log + analytics produced by a real run. Adopted by the review-surface
 * e2e (#692); selectors verified against:
 *   - src/components/molecules/FocusedDialog.tsx   (portal `.fixed.inset-0`, header `<h2>`, `button[title="Close"]`)
 *   - src/components/organisms/review/FullscreenReview.tsx  (Workout Log `<section>`, `ReviewGrid`)
 */
export class ReviewPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  async goto(runtimeId: string) {
    // Navigate only — do NOT wait for the overlay. Defensive states
    // ("Result not found." / "Failed to load result.") render no close
    // button; callers wait for what they expect (overlay vs error text).
    await this.page.goto(`/review/${runtimeId}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  }

  /** Resolved once the review overlay is mounted (close button present). */
  async waitForLoad() {
    await expect(this.closeButton()).toBeVisible({ timeout: 20_000 });
    await this.page.waitForTimeout(400);
  }

  // ── Overlay chrome ───────────────────────────────────────────────────────

  /** The FocusedDialog portal (`fixed inset-0 z-[100]`). */
  overlay(): Locator {
    return this.page.locator('.fixed.inset-0').first();
  }

  closeButton(): Locator {
    return this.page.locator('button[title="Close"]').first();
  }

  async clickClose() {
    await this.closeButton().click();
    await this.page.waitForTimeout(200);
  }

  // ── Content ──────────────────────────────────────────────────────────────

  /** Header title (the note label the Result Recorder stamped). */
  title(): Locator {
    return this.page.locator('.fixed.inset-0 h2').first();
  }

  /** "📋 Workout Log" section heading — present whenever the grid mounts. */
  workoutLogHeading(): Locator {
    return this.page.getByText('Workout Log').first();
  }

  /** The review grid table. Empty-segment reviews still render the table shell. */
  reviewGrid(): Locator {
    return this.page.locator('.fixed.inset-0 table').first();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  async expectOverlayVisible() {
    await expect(this.overlay()).toBeVisible();
  }

  async expectTitle(text: string) {
    await expect(this.title()).toHaveText(text, { timeout: 5_000 });
  }

  async expectMovementVisible(movement: string) {
    await expect(this.overlay().getByText(movement, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  }

  async expectWorkoutLogVisible() {
    await expect(this.workoutLogHeading()).toBeVisible({ timeout: 5_000 });
    await expect(this.reviewGrid()).toBeVisible({ timeout: 5_000 });
  }
}
