/**
 * Content Provider Types
 *
 * Defines the IContentProvider interface and related types.
 * Providers are injected, not imported — components receive IContentProvider from context.
 * Swapping to a different provider (e.g., API-backed) = one-line change at the app root.
 */

import type { HistoryEntry, EntryQuery, ProviderCapabilities } from './history';
import type { Attachment } from './storage';

export type AttachmentCreateInput = Omit<Attachment, 'id' | 'noteId' | 'createdAt'> & { id?: string };

/**
 * Input to `saveEntry`. The identity/timestamp fields are optional: present
 * when re-importing an exported note (so the round-trip preserves them and
 * overwrites the original instead of duplicating), absent on the normal create
 * path (the provider mints fresh values).
 */
export type NoteSaveInput = Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
};

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
  /**
   * Which storage engine backs this provider. When `'indexed-db'`, the
   * persistence factory picks `IndexedDBNotePersistence` (direct IDB access
   * for cascade-delete and analytics). Otherwise it falls back to
   * `ContentProviderNotePersistence` (generic, goes through the provider API).
   * Picking the adapter from this field instead of `instanceof` keeps the
   * factory decoupled from concrete provider classes.
   */
  readonly persistenceBackend?: 'indexed-db' | 'content-provider';

  // Read (always async)
  getEntries(query?: EntryQuery): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;


  /**
   * Create or overwrite a note. When `id`/`createdAt`/`updatedAt` are present
   * (the export → import round-trip recovers them), they are preserved so a
   * re-imported note overwrites its original instead of duplicating. When
   * absent (the normal create path), the provider mints fresh values.
   */
  saveEntry(entry: NoteSaveInput): Promise<HistoryEntry>;
  cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry>;
  updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'results' | 'tags' | 'notes' | 'title' | 'clonedIds' | 'targetDate'>> & { sectionId?: string; resultId?: string; blockId?: string; blockContentId?: string; version?: number }): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<void>;

  // Attachments
  getAttachments(noteId: string): Promise<Attachment[]>;
  saveAttachment(noteId: string, attachment: AttachmentCreateInput): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;
}
