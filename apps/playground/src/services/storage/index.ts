import type {
  IReadOnlyStore,
  IReadWriteStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
} from './IStorage';
import { IndexedDBStorage } from './IndexedDBStorage';
import { InMemoryStorage } from './InMemoryStorage';
import { StorageService } from './StorageService';
import { ApiStorage } from '@bitcobblers/wod-wiki-storage';
import type { DomainQuery, DomainQueryResult } from '@bitcobblers/wod-wiki-storage';
import { createProfileService } from '../profile';

import { LocalStore, InMemoryBackend, browserLocalStorageBackend, type StorageBackend } from './LocalStore';
export type {
  IReadOnlyStore,
  IReadWriteStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
};
export { IndexedDBStorage, InMemoryStorage, StorageService };
export { segmentRowId, resolveLatestSegment } from './StorageService';
export { LocalStore, InMemoryBackend, browserLocalStorageBackend };
export type { StorageBackend };

// Backend selection: VITE_STORAGE=api persists through the HTTP ApiStorage
// backend (VITE_API_URL base, default '/api'); unset keeps the IndexedDB
// default, bit-identical to pre-cutover behavior.
export const storageBackend: 'api' | 'indexed-db' =
  import.meta.env.VITE_STORAGE === 'api' ? 'api' : 'indexed-db';

// Identity getter is a lazy closure: resolved at put-time, after the profile
// bootstrap ran (currentSync() undefined until then → rows stored unstamped).
export const profileService = createProfileService(storageBackend);

function createDefaultStorage(): IStorage {
  const options = { getUserId: () => profileService.currentSync()?.id };
  return storageBackend === 'api'
    ? new ApiStorage(import.meta.env.VITE_API_URL ?? '/api', undefined, options)
    : new IndexedDBStorage(options);
}

let currentStorage: IStorage = createDefaultStorage();

export const storage: IStorage = {
  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>> {
    return currentStorage.readonly(store);
  },
  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>> {
    return currentStorage.readwrite(store);
  },
  transaction<K extends StoreName, R>(
    stores: K[],
    mode: 'readonly' | 'readwrite',
    fn: (tx: IStorageTransaction) => Promise<R>
  ): Promise<R> {
    return currentStorage.transaction(stores, mode, fn);
  },
  /** Remote domain-query pass-through — undefined on local backends
   *  (IStorage.queryDomain is optional and local adapters don't implement
   *  it), the API result on ApiStorage. */
  async queryDomain(query: DomainQuery): Promise<DomainQueryResult | undefined> {
    return currentStorage.queryDomain?.(query);
  },
  wipe(): Promise<void> {
    return currentStorage.wipe();
  },
  close(): Promise<void> {
    return currentStorage.close();
  },
};
export const storageService = new StorageService(storage);

export function setStorageForTesting(newStorage: IStorage): void {
  currentStorage = newStorage;
}

export function resetStorageForTesting(): void {
  currentStorage = createDefaultStorage();
}
