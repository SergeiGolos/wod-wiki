/**
 * Query Service Factory — app-side persistence wiring (issue #970, AC 4).
 *
 * Wires the pure `QueryService` from `@bitcobblers/wod-wiki-engine` to the app's
 * IndexedDB stores. The engine package itself is store-free: its default
 * constructor stores are empty stubs, so every app surface imports the
 * singleton (or factory) from here.
 *
 * Unified event store (0.6.36, tickets 003/005): the old FactQueryStore +
 * ResultLogStore seam collapsed into the single EventStore, served by
 * IndexedDBService's `events` store. The content plane (notes / blocks /
 * efforts) is unchanged.
 */

import {
  QueryService,
  type NoteQueryStore,
  type BlockQueryStore,
  type EffortQueryStore,
  type EventStore,
} from '@bitcobblers/wod-wiki-engine';
// wql's own IEffort — the engine umbrella re-exports lang's IEffort under the
// same name, and the two differ on baseAttributes' index signature (0.6.36).
import type { IEffort } from '@bitcobblers/wod-wiki-wql';
import { getAppEffortRegistry } from '@/services/effortRegistry';
import { storageService } from '@/services/storage';
import { staticNoteStore } from '@/services/content/staticBlockIndex';

/** Unified event store over IndexedDB — the `events` object store (V16). */
export const indexedDbEventStore: EventStore = {
  getEventsByTimeRange: (start: number, end: number) => storageService.getEventsByTimeRange(start, end),
  getEventsByMetricDates: (dates) => storageService.getEventsByMetricDates(dates),
  getEventsByResult: (resultId: string) => storageService.getEventsByResult(resultId),
  getEventsForNote: (noteId: string) => storageService.getEventsForNote(noteId),
  getEventsByContent: (blockContentId: string) => storageService.getEventsByContent(blockContentId),
  scanAll: () => storageService.scanAll(),
  appendEvents: (rows) => storageService.appendEvents(rows),
  finalizeSummaries: (resultId, rows) => storageService.finalizeSummaries(resultId, rows),
  deleteEvents: (ids) => storageService.deleteEvents(ids),
};

export const indexedDbNoteStore: NoteQueryStore = {
  getAllNotes: () => storageService.getAllNotes(),
  getNoteIdsForTag: async (label: string) =>
    new Set((await storageService.getNotesForTag(label)).map((n) => n.id)),
  getNoteTagLabels: async (noteId: string) =>
    (await storageService.getTagsForNote(noteId)).map((tag) => tag.label),
};

export const indexedDbBlockStore: BlockQueryStore = {
  getAllBlocks: () => storageService.getAllBlockIndex(),
};

/**
 * Production effort store: the CompositeEffortRegistry (bundled + user,
 * IndexedDB-backed), lazily constructed on first query.
 */
export class RegistryEffortStore implements EffortQueryStore {
  async getAllEfforts(): Promise<IEffort[]> {
    const registry = getAppEffortRegistry();
    if (!registry.isInitialized()) {
      await registry.loadBundled();
    }
    return [...registry.list()] as unknown as IEffort[]; // lang's IEffort.baseAttributes lacks the index signature wql's IEffort declares (engine-internal inconsistency, 0.6.36)
  }
}

export function createQueryService(): QueryService {
  return new QueryService(
    indexedDbEventStore,
    indexedDbNoteStore,
    indexedDbBlockStore,
    new RegistryEffortStore(),
    staticNoteStore,
  );
}

/**
 * App-wide singleton — the replacement for the engine package's old
 * `queryService` default export, now wired to IndexedDB.
 */
export const queryService = createQueryService();

/** Playground-facing alias. */
export const createPlaygroundQueryService = createQueryService;
