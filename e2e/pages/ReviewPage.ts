import { Page, Locator, expect } from '@playwright/test';

/**
 * ReviewPage — Page Object for /review/:runtimeId
 *
 * A full-screen overlay (FocusedDialog + FullscreenReview) that shows
 * workout results and analytics. Part of the Note Template execution flow.
 */
export class ReviewPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  async goto(runtimeId: string) {
    await this.page.goto(`/review/${runtimeId}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForSelector('button[title="Close"]', { timeout: 15_000 });
    await this.page.waitForTimeout(400);
  }

  // ── Overlay chrome ───────────────────────────────────────────────────────

  overlay(): Locator {
    return this.page.locator('.fixed.inset-0.z-\[100\]').first();
  }

  closeButton(): Locator {
    return this.page.locator('button[title="Close"]').first();
  }

  async clickClose() {
    await this.closeButton().click();
    await this.page.waitForTimeout(200);
  }

  // ── Content ──────────────────────────────────────────────────────────────

  title(): Locator {
    return this.page.locator('h2').first();
  }

  reviewGrid(): Locator {
    return this.page.locator('[data-testid="review-panel"]').or(this.page.locator('table:not([aria-hidden])')).first();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  async expectOverlayVisible() {
    await expect(this.overlay()).toBeVisible();
  }

  async expectOverlayHidden() {
    await expect(this.overlay()).toBeHidden();
  }

  async expectTitleContains(text: string) {
    await expect(this.title()).toContainText(text, { timeout: 5_000 });
  }

  async expectReviewGridVisible() {
    await expect(this.reviewGrid()).toBeVisible({ timeout: 5_000 });
  }
}
