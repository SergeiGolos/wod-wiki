/**
 * Playground query service — re-exports the app-side factory that wires
 * the pure `QueryService` from `@bitcobblers/wod-wiki-engine` to IndexedDB
 * (issue #970). Unified event store seam (0.6.36): the old fact/result-log
 * stores collapsed into the single `indexedDbEventStore`.
 */
export {
  queryService,
  createQueryService,
  createPlaygroundQueryService,
  indexedDbEventStore,
  indexedDbNoteStore,
  indexedDbBlockStore,
  RegistryEffortStore,
} from '@/services/queryService';
