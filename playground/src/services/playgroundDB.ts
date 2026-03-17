/**
 * PlaygroundDB — IndexedDB persistence for playground pages.
 *
 * Every page lives in the same `pages` store:
 *   - Static WOD files are keyed by `category/name`
 *   - User-created / zip-loaded pages are keyed by UUID
 *
 * Persisting content ensures WodBlock IDs (deterministic hashes) remain
 * stable across reloads, keeping workout results linked to the correct block.
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface PlaygroundPage {
  /** `category/name` for static WOD files, UUID for user-created pages */
  id: string;
  /** Category label (e.g. 'crossfit-girls') or 'playground' */
  category: string;
  /** Display name (e.g. 'fran' or 'Untitled') */
  name: string;
  /** The (possibly edited) markdown content */
  content: string;
  /** Unix-ms when last saved */
  updatedAt: number;
}

interface PlaygroundDBSchema extends DBSchema {
  pages: {
    key: string;
    value: PlaygroundPage;
    indexes: { 'by-updated': number; 'by-category': string };
  };
}

const DB_NAME = 'wodwiki-playground';
const DB_VERSION = 2;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PlaygroundDBService {
  private dbPromise: Promise<IDBPDatabase<PlaygroundDBSchema>>;

  constructor() {
    this.dbPromise = openDB<PlaygroundDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Drop and recreate on major schema change
        if (oldVersion < 2 && db.objectStoreNames.contains('pages')) {
          db.deleteObjectStore('pages');
        }
        // Clean up v1 notes store if it exists
        if (oldVersion < 2 && (db.objectStoreNames as DOMStringList).contains('notes')) {
          db.deleteObjectStore('notes' as any);
        }
        if (!db.objectStoreNames.contains('pages')) {
          const store = db.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
          store.createIndex('by-category', 'category');
        }
      },
    });
  }

  /** Build a deterministic page ID from category + name. */
  static pageId(category: string, name: string): string {
    return `${category}/${name}`;
  }

  async getPage(id: string): Promise<PlaygroundPage | undefined> {
    return (await this.dbPromise).get('pages', id);
  }

  async savePage(page: PlaygroundPage): Promise<string> {
    return (await this.dbPromise).put('pages', page);
  }

  async deletePage(id: string): Promise<void> {
    return (await this.dbPromise).delete('pages', id);
  }

  async getAllPages(): Promise<PlaygroundPage[]> {
    return (await this.dbPromise).getAll('pages');
  }

  /** Get all pages in a given category (e.g. 'playground'). */
  async getPagesByCategory(category: string): Promise<PlaygroundPage[]> {
    return (await this.dbPromise).getAllFromIndex('pages', 'by-category', category);
  }

  /** Delete all cached pages (reset to MD originals). */
  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('pages', 'readwrite');
    await tx.objectStore('pages').clear();
    await tx.done;
  }
}

export const playgroundDB = new PlaygroundDBService();
