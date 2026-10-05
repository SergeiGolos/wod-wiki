/**
 * Boundary file — the canonical storage contract lives in
 * `@bitcobblers/wod-wiki-storage` (packages/storage/src/contract.ts).
 * Kept so the relative './IStorage' import sites stay untouched.
 */
export type {
  StorageSchema,
  StoreName,
  StoreType,
  IReadOnlyStore,
  IReadWriteStore,
  IStorageTransaction,
  IStorage,
} from '@bitcobblers/wod-wiki-storage';
