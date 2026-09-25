import { CompositeEffortRegistry } from '@bitcobblers/wod-wiki-lang';
import { storageService } from '@/services/storage';
import { indexedDBEffortStorage } from './db/IndexedDBEffortStorage';

/**
 * The app effort registry — BOTH tiers live in IndexedDB (docs/prototypes/
 * seed-data-unification.md):
 *
 *   - bundled tier: rows the Seed Import materialized from the efforts
 *     chunk (`registrySource: 'bundled'`);
 *   - user tier: clones/edits persisted through the storage adapter
 *     (`registrySource: 'user'`, `-custom` slugs).
 *
 * Hydration is async because the store read is; construct synchronously,
 * then `hydrateAppEffortRegistry` before declaring readiness.
 */
export function createAppEffortRegistry(): CompositeEffortRegistry {
  return new CompositeEffortRegistry({
    storage: indexedDBEffortStorage,
  });
}

/** Load both tiers from IndexedDB: seed rows feed the read-only tier. */
export async function hydrateAppEffortRegistry(registry: CompositeEffortRegistry): Promise<void> {
  const all = await storageService.getAllEfforts();
  const bundled = all.filter((effort) => effort.registrySource === 'bundled');
  if (bundled.length > 0) {
    await registry.loadBundled(bundled);
  } else if (!registry.isInitialized()) {
    await registry.loadBundled();
  }
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
