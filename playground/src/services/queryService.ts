/**
 * Playground query service — re-exports the app-side factory that wires
 * the pure `QueryService` from `@bitcobblers/wod-wiki-engine` to IndexedDB (issue #970).
 */
export {
  queryService,
  createQueryService,
  createPlaygroundQueryService,
  indexedDbFactStore,
  indexedDbNoteStore,
  indexedDbBlockStore,
  indexedDbResultStore,
  RegistryEffortStore,
} from '@/services/queryService';
