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
export { LocalStore, InMemoryBackend, browserLocalStorageBackend };
export type { StorageBackend };

let currentStorage: IStorage = new IndexedDBStorage();

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
  currentStorage = new IndexedDBStorage();
}
