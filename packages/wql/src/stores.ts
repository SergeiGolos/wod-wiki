/**
 * Injected store interfaces for WQL QueryService.
 * Zero database/storage dependencies — 100% pure abstractions.
 *
 * Ticket 003: FactQueryStore + ResultLogStore collapsed into the single
 * UnifiedEventStore — two names for one data source. The content plane
 * (notes / blocks / efforts) is unchanged by workout-data unification.
 */

import type { BlockIndexRow, Note, EventRecord, Page, PageNote } from '@bitcobblers/wod-wiki-core';

/**
 * Store surface for the unified event table — every workout-data read the
 * Query Service needs, plus the write contract owned by the write-path
 * lifecycle (ticket 005).
 */
export interface EventStore {
    /** Ticket 12/14 complete-fetch seam: candidates whose METRIC date
     *  (civil, multiEntry index) falls in the requested dates — rows whose
     *  own date differs from their fetch-hint timestamp are reachable. */
    getEventsByMetricDates?(dates: readonly string[]): Promise<EventRecord[]>;
  // ── reads (all return EventRecord) ──────────────────────────
  /** Windowed fetch — the one proven culling index (ticket 001). */
  getEventsByTimeRange(start: number, end: number): Promise<EventRecord[]>;
  /** Per-result fetch (rows:{result:…}, re-finalize, orphan inspection). */
  getEventsByResult(resultId: string): Promise<EventRecord[]>;
  /** Note-scoped fetch (rows:{note:…}). */
  getEventsForNote(noteId: string): Promise<EventRecord[]>;
  /** Content-scoped fetch — the cross-store join hot path (indexed). */
  getEventsByContent(blockContentId: string): Promise<EventRecord[]>;
  /** Full scan — all-time SELECT leg (ticket 001: scan beats non-selective indexes). */
  scanAll(): Promise<EventRecord[]>;

  // ── writes (contract: ticket 005) ──────────────────────────────────
  /** Append event rows (per-statement flush; same-tick coalescing allowed). */
  appendEvents(rows: EventRecord[]): Promise<void>;
  /** Atomic finalize: clear the result's engine-authored summaries, write finals. */
  finalizeSummaries(resultId: string, rows: EventRecord[]): Promise<void>;
  /** Reconcile deletes (wellness note-save) + GC sweeps. */
  deleteEvents(ids: string[]): Promise<void>;
}


/** Store surface for content queries (`:note`). */
export interface NoteQueryStore {
  getAllNotes(): Promise<Note[]>;
  getNoteIdsForTag(label: string): Promise<Set<string>>;
  /** Note-tags label set of one note (moved here from FactQueryStore — it
   *  reads note tags, not facts). */
  getNoteTagLabels(noteId: string): Promise<string[]>;
}

/** Store surface for block-index queries (`:block`). */
export interface BlockQueryStore {
  getAllBlocks(): Promise<BlockIndexRow[]>;
}

/** Pure effort model interface for `:effort` queries. */
export interface IEffort {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  baseAttributes: {
    met?: number;
    discipline?: string;
    intensityTier?: string;
    [key: string]: unknown;
  };
  registrySource?: 'bundled' | 'user' | string;
  [key: string]: unknown;
}
export interface EffortQueryStore {
  getAllEfforts(): Promise<IEffort[]>;
}

/** Optional bundle of stores for QueryService initialization. */
export interface QueryServiceStores {
  eventStore?: EventStore;
  noteStore?: NoteQueryStore;
  /** Serves every block row — user journal and seeded corpus alike (the
   *  seed importer materializes corpus rows into the same store). */
  blockStore?: BlockQueryStore;
  effortStore?: EffortQueryStore;
  /** Derived corpus-note projections (catalog/tag planes). */
  staticNoteStore?: NoteQueryStore;
  /** Serves exercise containment rows (`block_efforts` store). */
  blockEffortsStore?: { getAllFromIndex(index: string, key: string): Promise<any[]> };
  /** Serves tag records (`tags` store). */
  tagsStore?: { getAllFromIndex(index: string, key: string): Promise<any[]> };
  /** Serves note-tag junction rows (`note_tags` store). */
  noteTagsStore?: { getAllFromIndex(index: string, key: string): Promise<any[]> };
  /** Canonical page_notes junction reads for container resolution — a
   *  note's parent Page wins over a standalone Note container. */
  pageStore?: {
    getNotePages(noteId: string): Promise<PageNote[]>;
    getPage(pageId: string): Promise<Page | undefined>;
  };
  /** Synchronous named datasets (`@session`, `@today`, user-stored sources)
   *  populated by the host before queries run — pipeline dataset stages
   *  never touch the database. */
  datasetStore?: {
    getDataset(name: string): { events: EventRecord[]; notes: Note[] } | undefined;
  };
}
