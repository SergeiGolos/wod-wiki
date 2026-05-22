import { Page } from '@playwright/test';
import { BaseNotePage } from './BaseNotePage';

/**
 * PlaygroundNotePage — Page Object for /playground/:id
 *
 * An ephemeral scratchpad workspace for experimenting with WodScript.
 * Uses the same Note Workspace template as journal entries.
 */
export class PlaygroundNotePage extends BaseNotePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  url(id?: string) {
    return id ? `/playground/${encodeURIComponent(id)}` : '/playground';
  }

  async goto(id?: string) {
    await this.page.goto(this.url(id), { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.waitForLoad();
  }

  /**
   * Create a brand-new playground page.
   * Visiting /playground redirects to a UUID-based route.
   */
  async createNew() {
    await this.page.goto('/playground', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await this.page.waitForURL(/\/playground\//, { timeout: 10_000 });
    await this.waitForLoad();
  }

  // ── IndexedDB helpers ────────────────────────────────────────────────────

  /** Delete a playground note from IndexedDB. */
  async clearStoredNote(id: string) {
    await this.page.evaluate(async ({ pageId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('wodwiki-playground');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['pages'], 'readwrite');
          tx.objectStore('pages').delete(pageId);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { pageId: `playground/${id}` });
  }
}
