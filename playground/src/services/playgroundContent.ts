/**
 * playgroundContent — the single source for playground note content, backed by
 * the `wodwiki-db` notes/segments stores (via IndexedDBContentProvider).
 *
 * This replaces the separate `wodwiki-playground` database (`playgroundDB`),
 * consolidating note content and results into ONE database. It intentionally
 * mirrors `playgroundDB`'s old API surface (pageId / getPage / savePage /
 * addPage / getAllPages / getPagesByCategory / deletePage / clearAll) so the
 * call sites swap over mechanically.
 *
 * Identity: a page's id is the composite `category/name` (unchanged), which is
 * also the `Note.id` and the `WorkoutResult.noteId` — so content and results
 * join exactly, with no `sameNoteId` shim needed for new data. Category is
 * recovered from the id prefix, so no tag/type encoding is required.
 */
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import type { HistoryEntry } from '@/types/history';

export interface PlaygroundPage {
  /** `category/name` composite — also the Note.id and WorkoutResult.noteId. */
  id: string;
  category: string;
  name: string;
  content: string;
  updatedAt: number;
}

/** Build a page id from its category + name (mirrors the old PlaygroundDBService.pageId). */
export function pageId(category: string, name: string): string {
  return `${category}/${name}`;
}

function categoryOf(id: string): string {
  const idx = id.indexOf('/');
  return idx < 0 ? id : id.slice(0, idx);
}

function toPage(entry: HistoryEntry): PlaygroundPage {
  return {
    id: entry.id,
    category: categoryOf(entry.id),
    name: entry.title || entry.id,
    content: entry.rawContent ?? '',
    updatedAt: entry.updatedAt ?? Date.now(),
  };
}

// One provider instance over the shared `indexedDBService` (wodwiki-db). The
// provider is stateless over the shared store, so this instance sees the same
// data as the persistence seam's internal one.
const provider = new IndexedDBContentProvider();

export const playgroundContent = {
  pageId,

  async getPage(id: string): Promise<PlaygroundPage | undefined> {
    const entry = await provider.getEntry(id);
    return entry ? toPage(entry) : undefined;
  },

  /** Upsert a page by id (creates the Note + segments if absent, updates if present). */
  async savePage(page: PlaygroundPage): Promise<string> {
    const saved = await provider.saveEntry({
      id: page.id,
      title: page.name,
      rawContent: page.content,
      tags: [],
      targetDate: page.updatedAt,
      type: 'playground',
    });
    return saved.id;
  },

  /** Create a page, rejecting if one already exists with this id (add semantics). */
  async addPage(page: PlaygroundPage): Promise<string> {
    const existing = await provider.getEntry(page.id);
    if (existing) {
      throw new DOMException(`Page already exists: ${page.id}`, 'ConstraintError');
    }
    return this.savePage(page);
  },

  async getAllPages(): Promise<PlaygroundPage[]> {
    const entries = await provider.getEntries();
    return entries.map(toPage);
  },

  async getPagesByCategory(category: string): Promise<PlaygroundPage[]> {
    const entries = await provider.getEntries();
    return entries.filter((e) => categoryOf(e.id) === category).map(toPage);
  },

  async deletePage(id: string): Promise<void> {
    await provider.deleteEntry(id);
  },

  /** Remove every playground-managed page (id contains a category separator). */
  async clearAll(): Promise<void> {
    const entries = await provider.getEntries();
    await Promise.all(
      entries.filter((e) => e.id.includes('/')).map((e) => provider.deleteEntry(e.id)),
    );
  },
};
