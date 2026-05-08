import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import type { IContentProvider } from '@/types/content-provider';

import { ContentProviderNotePersistence } from './ContentProviderNotePersistence';
import type { INotePersistence } from './INotePersistence';
import { IndexedDBNotePersistence } from './IndexedDBNotePersistence';

export type { INotePersistence } from './INotePersistence';
export { ContentProviderNotePersistence } from './ContentProviderNotePersistence';
export { IndexedDBNotePersistence, normalizeAnalyticsSegments } from './IndexedDBNotePersistence';
export * from './types';

export function createNotePersistence(provider: IContentProvider): INotePersistence {
  if (provider instanceof IndexedDBContentProvider) {
    return new IndexedDBNotePersistence();
  }

  return new ContentProviderNotePersistence(provider);
}

/**
 * Singleton persistence instance backed by IndexedDB.
 * Use this in non-React contexts (page-level scripts, legacy routes)
 * that need note persistence without a WorkbenchContext.
 */
export const notePersistence: INotePersistence = new IndexedDBNotePersistence();
