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
