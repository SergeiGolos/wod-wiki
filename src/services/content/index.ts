/**
 * Content Provider Module
 *
 * Barrel export for content provider types and implementations.
 * Use `createContentProvider` factory for convenient construction.
 */

export { StaticContentProvider } from './StaticContentProvider';
export { LocalStorageContentProvider } from './LocalStorageContentProvider';

export type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
export type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';

import type { IContentProvider } from '../../types/content-provider';
import { StaticContentProvider } from './StaticContentProvider';
import { LocalStorageContentProvider } from './LocalStorageContentProvider';

/**
 * Factory helper for creating content providers.
 *
 * @example
 * ```ts
 * const staticProvider = createContentProvider({ mode: 'static', initialContent: '# Workout' });
 * const historyProvider = createContentProvider({ mode: 'history' });
 * ```
 */
export function createContentProvider(
  config: { mode: 'static'; initialContent: string } | { mode: 'history' }
): IContentProvider {
  if (config.mode === 'static') {
    return new StaticContentProvider(config.initialContent);
  }
  return new LocalStorageContentProvider();
}
