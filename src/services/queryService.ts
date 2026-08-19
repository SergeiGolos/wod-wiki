/**
 * Query Service Factory — app-side persistence wiring (issue #970, AC 4).
 *
 * Wires the pure `QueryService` from `@bitcobblers/wod-wiki-engine` to the app's
 * IndexedDB stores. The engine package itself is store-free: its default
 * constructor stores are empty stubs, so every app surface imports the
 * singleton (or factory) from here.
 */

import {
  QueryService,
  type FactQueryStore,
  type NoteQueryStore,
  type BlockQueryStore,
  type ResultLogStore,
  type EffortQueryStore,
  type IEffort,
} from '@bitcobblers/wod-wiki-engine';
import { CompositeEffortRegistry } from '@/effort-registry';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { staticNoteStore, staticBlockStore } from '@/services/content/staticBlockIndex';
export const indexedDbFactStore: FactQueryStore = {
  getFactsByMetric: (metricKey: string) => indexedDBService.getFactsByMetric(metricKey),
  getFactsByTimeRange: (start: number, end: number) => indexedDBService.getFactsByTimeRange(start, end),
  getNoteTagLabels: async (noteId: string) =>
    (await indexedDBService.getTagsForNote(noteId)).map((tag) => tag.label),
};

export const indexedDbNoteStore: NoteQueryStore = {
  getAllNotes: () => indexedDBService.getAllNotes(),
  getNoteIdsForTag: async (label: string) =>
    new Set((await indexedDBService.getNotesForTag(label)).map((n) => n.id)),
};

export const indexedDbBlockStore: BlockQueryStore = {
  getAllBlocks: () => indexedDBService.getAllBlockIndex(),
};

export const indexedDbResultStore: ResultLogStore = {
  getResultsByContentId: (blockContentId: string) =>
    indexedDBService.getResultsByContentId(blockContentId),
  getResultById: (resultId: string) => indexedDBService.getResultById(resultId),
  getResultsForNote: (noteId: string) => indexedDBService.getResultsForNote(noteId),
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
    return [...this.registry.list()];
  }
}

export function createQueryService(): QueryService {
  return new QueryService(
    indexedDbFactStore,
    indexedDbNoteStore,
    indexedDbBlockStore,
    indexedDbResultStore,
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
