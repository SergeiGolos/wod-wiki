/**
 * Injected store interfaces for WQL QueryService.
 * Zero database/storage dependencies — 100% pure abstractions.
 */

import type { AnalyticsDataPoint, Note, BlockIndexRow, WorkoutResult } from '@wod-wiki/core';

/** Store surface the Query Service needs for fact rows. */
export interface FactQueryStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]>;
  getNoteTagLabels(noteId: string): Promise<string[]>;
}

/** Store surface for content queries (`find:note`). */
export interface NoteQueryStore {
  getAllNotes(): Promise<Note[]>;
  getNoteIdsForTag(label: string): Promise<Set<string>>;
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

/** Store surface for raw WorkoutResult logs — the cross-store join & rows source. */
export interface ResultLogStore {
  getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]>;
  /** Rows plane (#949): single-result scope (`rows:{result:…}`). */
  getResultById(resultId: string): Promise<WorkoutResult | undefined>;
  /** Rows plane (#949): whole-note scope (`rows:{note:…}`). */
  getResultsForNote(noteId: string): Promise<WorkoutResult[]>;
}

/** Optional bundle of stores for QueryService initialization. */
export interface QueryServiceStores {
  factStore?: FactQueryStore;
  noteStore?: NoteQueryStore;
  blockStore?: BlockQueryStore;
  resultStore?: ResultLogStore;
  effortStore?: EffortQueryStore;
  staticNoteStore?: NoteQueryStore;
  staticBlockStore?: BlockQueryStore;
}
