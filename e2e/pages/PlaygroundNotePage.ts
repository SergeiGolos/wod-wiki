import { Page } from '@playwright/test';
import { BaseNotePage } from './BaseNotePage';
import { deleteNoteByRouteId } from '../helpers/wodwikiDb';

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

  /** Delete a playground note from wodwiki-db. */
  async clearStoredNote(id: string) {
    await deleteNoteByRouteId(this.page, `playground/${id}`);
  }
}
