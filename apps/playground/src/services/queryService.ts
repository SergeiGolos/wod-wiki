/**
 * Query Service Factory — app-side persistence wiring (issue #970, AC 4).
 *
 * Wires the pure `QueryService` from `@bitcobblers/wod-wiki-engine` to the app's
 * IndexedDB stores. The engine package itself is store-free: its default
 * constructor stores are empty stubs, so every app surface imports the
 * singleton (or factory) from here.
 *
 * Unified event store (0.6.36, tickets 003/005): the old FactQueryStore +
 * ResultLogStore seam collapsed into the single UnifiedEventStore, served by
 * IndexedDBService's `events` store. The content plane (notes / blocks /
 * efforts) is unchanged.
 */

import {
  QueryService,
  type NoteQueryStore,
  type BlockQueryStore,
  type EffortQueryStore,
  type UnifiedEventStore,
} from '@bitcobblers/wod-wiki-engine';
// wql's own IEffort — the engine umbrella re-exports lang's IEffort under the
// same name, and the two differ on baseAttributes' index signature (0.6.36).
import type { IEffort } from '@bitcobblers/wod-wiki-wql';
import { CompositeEffortRegistry } from '@/effort-registry';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { staticNoteStore, staticBlockStore } from '@/services/content/staticBlockIndex';

/** Unified event store over IndexedDB — the `events` object store (V16). */
export const indexedDbEventStore: UnifiedEventStore = {
  getEventsByTimeRange: (start: number, end: number) => indexedDBService.getEventsByTimeRange(start, end),
  getEventsByResult: (resultId: string) => indexedDBService.getEventsByResult(resultId),
  getEventsForNote: (noteId: string) => indexedDBService.getEventsForNote(noteId),
  getEventsByContent: (blockContentId: string) => indexedDBService.getEventsByContent(blockContentId),
  scanAll: () => indexedDBService.scanAll(),
  appendEvents: (rows) => indexedDBService.appendEvents(rows),
  finalizeSummaries: (resultId, rows) => indexedDBService.finalizeSummaries(resultId, rows),
  deleteEvents: (ids) => indexedDBService.deleteEvents(ids),
};

export const indexedDbNoteStore: NoteQueryStore = {
  getAllNotes: () => indexedDBService.getAllNotes(),
  getNoteIdsForTag: async (label: string) =>
    new Set((await indexedDBService.getNotesForTag(label)).map((n) => n.id)),
  // Moved here from the retired FactQueryStore — it reads note tags, not facts.
  getNoteTagLabels: async (noteId: string) =>
    (await indexedDBService.getTagsForNote(noteId)).map((tag) => tag.label),
};

export const indexedDbBlockStore: BlockQueryStore = {
  getAllBlocks: () => indexedDBService.getAllBlockIndex(),
};

/**
 * Production effort store: the CompositeEffortRegistry (bundled + user,
 * IndexedDB-backed), lazily constructed on first query.
 */
export class RegistryEffortStore implements EffortQueryStore {
  private registry?: CompositeEffortRegistry;
  async getAllEfforts(): Promise<IEffort[]> {
    if (!this.registry) {
      this.registry = new CompositeEffortRegistry();
      await this.registry.loadBundled();
    }
    return [...this.registry.list()] as unknown as IEffort[]; // lang's IEffort.baseAttributes lacks the index signature wql's IEffort declares (engine-internal inconsistency, 0.6.36)
  }
}

export function createQueryService(): QueryService {
  return new QueryService(
    indexedDbEventStore,
    indexedDbNoteStore,
    indexedDbBlockStore,
    new RegistryEffortStore(),
    staticNoteStore,
    staticBlockStore,
  );
}

/**
 * App-wide singleton — the replacement for the engine package's old
 * `queryService` default export, now wired to IndexedDB.
 */
export const queryService = createQueryService();

/** Playground-facing alias. */
export const createPlaygroundQueryService = createQueryService;
