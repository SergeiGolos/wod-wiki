/**
 * Content Provider Types
 *
 * Defines the IContentProvider interface and related types.
 * Providers are injected, not imported — components receive IContentProvider from context.
 * Swapping to a different provider (e.g., API-backed) = one-line change at the app root.
 */

import type { HistoryEntry, EntryQuery, ProviderCapabilities } from './history';

/**
 * Content provider mode — the highest-level branching point in the system.
 * - 'history': Full history browsing, selection, and analysis
 * - 'static': Fixed content injection (Storybook, demos, embedded)
 */
export type ContentProviderMode = 'history' | 'static';

/**
 * IContentProvider — async interface consumed by the workbench.
 * All methods return Promises so that components never know whether
 * data is from memory, localStorage, or HTTP.
 */
export interface IContentProvider {
  readonly mode: ContentProviderMode;
  readonly capabilities: ProviderCapabilities;

  // Read (always async)
  getEntries(query?: EntryQuery): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;

  // Write (throws if !capabilities.canWrite)
  saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry>;
  cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry>;
  updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'clonedIds' | 'targetDate'>> & { sectionId?: string }): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<void>;
}
