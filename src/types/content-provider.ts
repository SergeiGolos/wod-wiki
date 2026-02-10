/**
 * Content Provider Types
 *
 * Defines the two content provider modes for the workbench:
 * - 'history': Production mode with browsable workout history
 * - 'static': Storybook/demo mode with injected content
 *
 * These types gate every downstream decision: strip mode, available views, landing view.
 */

import type { HistoryEntry, HistoryFilters } from './history';

/**
 * Content provider mode — the highest-level branching point in the system.
 * - 'history': Full history browsing, selection, and analysis
 * - 'static': Fixed content injection (Storybook, demos, embedded)
 */
export type ContentProviderMode = 'history' | 'static';

/**
 * History store interface — persistence layer for workout entries.
 * Implementation may use localStorage, IndexedDB, or a remote API.
 */
export interface IHistoryStore {
  getEntries(filters?: Partial<HistoryFilters>): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;
  saveEntry(entry: HistoryEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
}

/**
 * Discriminated union for type-safe content provider configuration.
 */
export type ContentProvider =
  | { mode: 'history'; historyStore: IHistoryStore }
  | { mode: 'static'; initialContent: string };
