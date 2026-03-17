/**
 * PlaygroundDB — IndexedDB persistence for playground workout pages.
 *
 * Provides a cache layer so that edited workout content is preserved across
 * page loads. WodBlock IDs are deterministic hashes of content + position, so
 * persisting the content ensures the same IDs are generated each time, keeping
 * workout results linked to the correct block.
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface PlaygroundPage {
  /** Deterministic key: `${category}/${name}` */
  id: string;
  category: string;
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
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'wodwiki-playground';
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PlaygroundDBService {
  private dbPromise: Promise<IDBPDatabase<PlaygroundDBSchema>>;

  constructor() {
    this.dbPromise = openDB<PlaygroundDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pages')) {
          const store = db.createObjectStore('pages', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
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

  /** Delete all cached pages (reset to MD originals). */
  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('pages', 'readwrite');
    await tx.objectStore('pages').clear();
    await tx.done;
  }
}

export const playgroundDB = new PlaygroundDBService();
