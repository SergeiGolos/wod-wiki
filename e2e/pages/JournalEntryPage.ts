import { Page, Locator, expect } from '@playwright/test';

const DB_NAME = 'wodwiki-playground';

export class JournalEntryPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  url(date: string) {
    return `/journal/${date}`;
  }

  async goto(date: string) {
    await this.page.goto(this.url(date), { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForEditor();
  }

  async gotoJournalList() {
    await this.page.goto('/journal', { waitUntil: 'domcontentloaded', timeout: 20_000 });
  }

  // ── Editor ────────────────────────────────────────────────────────────────

  editor(): Locator {
    return this.page.locator('.cm-content[contenteditable="true"]').first();
  }

  async waitForEditor() {
    await this.page.waitForSelector('.cm-content[contenteditable="true"]', { timeout: 15_000 });
    // Give React time to finish loading content from IndexedDB
    await this.page.waitForTimeout(600);
  }

  async editorText(): Promise<string> {
    return this.editor().innerText();
  }

  async typeInEditor(text: string) {
    // Click end of editor then type
    const ed = this.editor();
    await ed.click();
    await this.page.keyboard.press('End');
    await this.page.keyboard.type(text);
  }

  async replaceEditorContent(text: string) {
    const ed = this.editor();
    await ed.click();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(text);
  }

  // ── Page title ────────────────────────────────────────────────────────────

  title(): Locator {
    return this.page.locator('h1').first();
  }

  // ── IndexedDB helpers ─────────────────────────────────────────────────────

  /** Delete a journal entry from IndexedDB (resets to template on next load). */
  async clearStoredEntry(date: string) {
    await this.page.evaluate(async ({ dbName, pageId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['pages'], 'readwrite');
          tx.objectStore('pages').delete(pageId);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: DB_NAME, pageId: `journal/${date}` });
  }

  /** Read raw content from IndexedDB (bypasses React — confirms the actual persisted value). */
  async storedContent(date: string): Promise<string | null> {
    return this.page.evaluate(async ({ dbName, pageId }) => {
      return new Promise<string | null>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['pages'], 'readonly');
          const getReq = tx.objectStore('pages').get(pageId);
          getReq.onsuccess = () => { db.close(); resolve(getReq.result?.content ?? null); };
          getReq.onerror = () => { db.close(); reject(getReq.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: DB_NAME, pageId: `journal/${date}` });
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async expectEditorContains(text: string) {
    await expect(this.editor()).toContainText(text, { timeout: 5_000 });
  }

  async expectTitleContains(text: string) {
    await expect(this.title()).toContainText(text, { timeout: 5_000 });
  }
}
