import { Page, Locator, expect } from '@playwright/test';
import { BaseNotePage } from './BaseNotePage';

/**
 * WorkoutEditorPage — Page Object for /workout/:category/:name
 * and its alias /note/:category/:name.
 *
 * Loads bundled markdown content into the NoteEditor via IndexedDB
 * fallback. Collection workouts get inline run commands; syntax pages
 * get popup runtime behaviour.
 */
export class WorkoutEditorPage extends BaseNotePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  url(category: string, name: string) {
    return `/workout/${encodeURIComponent(category)}/${encodeURIComponent(name)}`;
  }

  noteUrl(category: string, name: string) {
    return `/note/${encodeURIComponent(category)}/${encodeURIComponent(name)}`;
  }

  async goto(category: string, name: string) {
    await this.page.goto(this.url(category, name), { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  async gotoNote(category: string, name: string) {
    await this.page.goto(this.noteUrl(category, name), { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  // ── Content assertions ───────────────────────────────────────────────────

  /** Assert the rendered prose contains expected text (outside the editor). */
  async expectProseContains(text: string) {
    await expect(this.page.locator('main, [role="main"]').first()).toContainText(text, { timeout: 5_000 });
  }
}
