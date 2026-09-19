import type { EffortStorageAdapter, IEffort } from '@bitcobblers/wod-wiki-lang';
import { storageService, type StorageService } from '@/services/storage';

/**
 * IndexedDB Effort Storage Adapter
 *
 * Implements EffortStorageAdapter using IndexedDBService to persist
 * user-defined custom efforts in the browser's 'efforts' object store.
 */
export class IndexedDBEffortStorage implements EffortStorageAdapter {
  constructor(private readonly db: StorageService = storageService) {}

  async load(): Promise<IEffort[]> {
    return this.db.getAllEfforts();
  }

  async save(effort: IEffort): Promise<void> {
    await this.db.saveEffort(effort);
  }

  async delete(slug: string): Promise<void> {
    await this.db.deleteEffort(slug);
  }
}

export const indexedDBEffortStorage = new IndexedDBEffortStorage();
