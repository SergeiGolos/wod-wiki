import { Page, Locator, expect } from '@playwright/test';

/**
 * WallClockPage — Page Object for /tracker/:runtimeId
 *
 * A full-screen overlay (FocusedDialog + RuntimeTimerPanel) that runs a
 * compiled ScriptBlock.  This is NOT a NoteEditor page, but it is part of the
 * Note Template execution flow.
 */
export class WallClockPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  async goto(runtimeId: string) {
    await this.page.goto(`/tracker/${runtimeId}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  async waitForLoad() {
    // Wait for the timer overlay to appear
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

  // ── Timer controls ───────────────────────────────────────────────────────

  /** Main timer circle — toggles play/pause. */
  timerCircle(): Locator {
    return this.page.locator('button:has(.title-play), button:has(.title-pause)').first();
  }

  startButton(): Locator {
    return this.page.locator('.title-play').first();
  }

  pauseButton(): Locator {
    return this.page.locator('.title-pause').first();
  }

  stopButton(): Locator {
    return this.page.locator('button[title="Stop Session"]').first();
  }

  nextButton(): Locator {
    return this.page.locator('button[title="Next Block"]').first();
  }

  async clickStart() {
    await this.timerCircle().click();
    await this.page.waitForTimeout(200);
  }

  async clickPause() {
    await this.timerCircle().click();
    await this.page.waitForTimeout(200);
  }

  async clickStop() {
    await this.stopButton().click();
    await this.page.waitForTimeout(200);
  }

  async clickNext() {
    await this.nextButton().click();
    await this.page.waitForTimeout(200);
  }

  // ── Timer display ────────────────────────────────────────────────────────

  timerDisplay(): Locator {
    return this.page.locator('.font-mono.font-semibold.tracking-tighter').first();
  }

  async timerText(): Promise<string> {
    return this.timerDisplay().innerText();
  }

  // ── State assertions ─────────────────────────────────────────────────────

  async expectOverlayVisible() {
    await expect(this.overlay()).toBeVisible();
  }

  async expectOverlayHidden() {
    await expect(this.overlay()).toBeHidden();
  }

  async expectTimerRunning() {
    await expect(this.pauseButton()).toBeVisible({ timeout: 5_000 });
  }

  async expectTimerPaused() {
    await expect(this.startButton()).toBeVisible({ timeout: 5_000 });
  }
}
