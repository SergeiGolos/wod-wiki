/**
 * Injected store interfaces for WQL QueryService.
 * Zero database/storage dependencies — 100% pure abstractions.
 *
 * Ticket 003: FactQueryStore + ResultLogStore collapsed into the single
 * UnifiedEventStore — two names for one data source. The content plane
 * (notes / blocks / efforts) is unchanged by workout-data unification.
 */

import type { BlockIndexRow, Note, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';

/**
 * Store surface for the unified event table — every workout-data read the
 * Query Service needs, plus the write contract owned by the write-path
 * lifecycle (ticket 005).
 */
export interface UnifiedEventStore {
  // ── reads (all return UnifiedEventRecord) ──────────────────────────
  /** Windowed fetch — the one proven culling index (ticket 001). */
  getEventsByTimeRange(start: number, end: number): Promise<UnifiedEventRecord[]>;
  /** Per-result fetch (rows:{result:…}, re-finalize, orphan inspection). */
  getEventsByResult(resultId: string): Promise<UnifiedEventRecord[]>;
  /** Note-scoped fetch (rows:{note:…}). */
  getEventsForNote(noteId: string): Promise<UnifiedEventRecord[]>;
  /** Content-scoped fetch — the cross-store join hot path (indexed). */
  getEventsByContent(blockContentId: string): Promise<UnifiedEventRecord[]>;
  /** Full scan — all-time SELECT leg (ticket 001: scan beats non-selective indexes). */
  scanAll(): Promise<UnifiedEventRecord[]>;

  // ── writes (contract: ticket 005) ──────────────────────────────────
  /** Append event rows (per-statement flush; same-tick coalescing allowed). */
  appendEvents(rows: UnifiedEventRecord[]): Promise<void>;
  /** Atomic finalize: clear the result's engine-authored summaries, write finals. */
  finalizeSummaries(resultId: string, rows: UnifiedEventRecord[]): Promise<void>;
  /** Reconcile deletes (wellness note-save) + GC sweeps. */
  deleteEvents(ids: string[]): Promise<void>;
}

/** Store surface for content queries (`find:note`). */
export interface NoteQueryStore {
  getAllNotes(): Promise<Note[]>;
  getNoteIdsForTag(label: string): Promise<Set<string>>;
  /** Note-tags label set of one note (moved here from FactQueryStore — it
   *  reads note tags, not facts). */
  getNoteTagLabels(noteId: string): Promise<string[]>;
}

/** Store surface for block-index queries (`find:block`). */
export interface BlockQueryStore {
  getAllBlocks(): Promise<BlockIndexRow[]>;
}

/** Pure effort model interface for `find:effort` queries. */
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

/** Store surface for effort queries (`find:effort`). */
export interface EffortQueryStore {
  getAllEfforts(): Promise<IEffort[]>;
}

/** Optional bundle of stores for QueryService initialization. */
export interface QueryServiceStores {
  eventStore?: UnifiedEventStore;
  noteStore?: NoteQueryStore;
  blockStore?: BlockQueryStore;
  effortStore?: EffortQueryStore;
  staticNoteStore?: NoteQueryStore;
  staticBlockStore?: BlockQueryStore;
}
