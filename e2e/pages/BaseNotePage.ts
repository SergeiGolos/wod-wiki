import { Page, Locator, expect } from '@playwright/test';

/**
 * BaseNotePage — shared Page Object for all Note Workspace routes.
 *
 * Covers the common surface shared by every page that mounts NoteEditor
 * inside JournalPageShell:
 *   /journal/:id, /playground/:id, /workout/:cat/:name, /note/:cat/:name
 *
 * Subclasses provide route-specific goto(...) signatures and any extra
 * selectors/assertions.
 */
export abstract class BaseNotePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  /** Route-specific entry point — implemented by subclass. */
  abstract goto(...args: any[]): Promise<void>;

  /** Wait until the editor surface is present and React has settled. */
  async waitForLoad() {
    await this.page.waitForSelector('.cm-content[contenteditable="true"]', {
      timeout: 15_000,
    });
    await this.page.waitForTimeout(400);
  }

  // ── Editor ───────────────────────────────────────────────────────────────

  /** The main CodeMirror contenteditable surface. */
  editor(): Locator {
    return this.page.locator('.cm-content[contenteditable="true"]').first();
  }

  /** Alias for waitForLoad() — semantically clearer in editor-centric tests. */
  async waitForEditor() {
    await this.waitForLoad();
  }

  /** Return the editor's current innerText. */
  async editorText(): Promise<string> {
    return this.editor().innerText();
  }

  /** Append text at the end of the editor. */
  async typeInEditor(text: string) {
    const ed = this.editor();
    await ed.click();
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(text);
  }

  /** Replace the entire editor contents. */
  async replaceEditorContent(text: string) {
    const ed = this.editor();
    await ed.click();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(text);
  }

  // ── Page chrome ──────────────────────────────────────────────────────────

  /** Primary page heading (sticky header title). */
  title(): Locator {
    return this.page.locator('h1').first();
  }

  // ── Workout actions ──────────────────────────────────────────────────────

  /** Click the "Run" button that appears inside the editor overlay. */
  async startWorkoutFromEditor() {
    const startBtn = this.page
      .locator('[data-testid="editor-start-workout"]')
      .first();
    await startBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await startBtn.click();
  }

  /** Open the actions dropdown (vertical ellipsis in the sticky header). */
  async openActionsMenu() {
    const trigger = this.page
      .locator('div.flex.items-center.gap-2.shrink-0 button, div.flex.items-center.gap-4 button')
      .last();
    await trigger.click();
    await this.page.waitForTimeout(300);
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  async expectEditorContains(text: string) {
    await expect(this.editor()).toContainText(text, { timeout: 5_000 });
  }

  async expectTitleContains(text: string) {
    await expect(this.title()).toContainText(text, { timeout: 5_000 });
  }
}
