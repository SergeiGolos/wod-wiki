import { Page, Locator, expect } from '@playwright/test';
import { BaseNotePage } from './BaseNotePage';

const DB_NAME = 'wodwiki-playground';

/**
 * JournalEntryPage — Page Object for /journal/:date
 *
 * Extends BaseNotePage for the shared note editor surface.
 * Adds journal-specific navigation (gotoJournalList) and
 * IndexedDB helpers for persistence testing.
 */
export class JournalEntryPage extends BaseNotePage {
  readonly page: Page;

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  url(date: string) {
    return `/journal/${date}`;
  }

  async goto(date: string) {
    await this.page.goto(this.url(date), { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  async gotoJournalList() {
    // Explicitly blur the editor first — this triggers onBlur → flush() → IDB write
    // before navigation tears down the component.
    await this.page.keyboard.press('Escape');
    await this.editor().blur();
    // Small pause to let the async IDB write from onBlur complete
    await this.page.waitForTimeout(200);

    // Use SPA navigation (click the sidebar link) so React Router unmounts the current
    // page component, triggering useEffect cleanup and flushing any pending IDB writes.
    // page.goto() is a hard navigation that skips React unmount entirely.
    const journalLink = this.page.locator('nav a[href="/journal"], nav a[href^="/journal"]:not([href*="/"]):not([href*="20"])').first();
    const exists = await journalLink.count();
    if (exists > 0) {
      await journalLink.click();
      await this.page.waitForURL(/\/journal/, { timeout: 10_000 });
    } else {
      // Fallback to hard navigation if nav link not found
      await this.page.goto('/journal', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    }
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
}
