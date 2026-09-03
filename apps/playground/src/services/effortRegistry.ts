import { CompositeEffortRegistry } from '@bitcobblers/wod-wiki-lang';
import { getBundledEfforts } from '@/repositories/effort-markdown';
import { indexedDBEffortStorage } from './db/IndexedDBEffortStorage';

/**
 * Creates a CompositeEffortRegistry configured for the Playground application:
 * 1. Bundled tier seeded from markdown/efforts/
 * 2. User tier persisted in IndexedDB
 */
export function createAppEffortRegistry(): CompositeEffortRegistry {
  return new CompositeEffortRegistry({
    bundled: getBundledEfforts(),
    storage: indexedDBEffortStorage,
  });
}

let appEffortRegistry: CompositeEffortRegistry | null = null;

/**
 * App-wide singleton CompositeEffortRegistry instance.
 */
export function getAppEffortRegistry(): CompositeEffortRegistry {
  if (!appEffortRegistry) {
    appEffortRegistry = createAppEffortRegistry();
  }
  return appEffortRegistry;
}
