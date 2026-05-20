import { indexedDBService } from '@/services/db/IndexedDBService';
import type { IEffort, IEffortRegistry, EffortRegistrySource } from './types';

/**
 * IndexedDB-backed Effort Registry
 *
 * Persists user-defined efforts in the 'efforts' object store.
 * Bundled efforts are NOT stored here; they live in the read-only
 * bundled seed file.
 */
export class IndexedDBEffortRegistry implements IEffortRegistry {
  constructor(private readonly db = indexedDBService) {}

  async loadBundled(): Promise<void> {
    // No-op: bundled efforts are handled by BundledEffortRegistry
  }

  resolve(slug: string): IEffort | null {
    // Synchronous interface required by IEffortRegistry;
    // IndexedDB is async. Callers should prefer resolveAsync.
    throw new Error(
      'IndexedDBEffortRegistry.resolve is async-only. Use resolveAsync(slug) instead.'
    );
  }

  async resolveAsync(slug: string): Promise<IEffort | null> {
    const db = await this.db.getDB();
    return db.get('efforts', slug) ?? null;
  }

  list(): readonly IEffort[] {
    throw new Error(
      'IndexedDBEffortRegistry.list is async-only. Use listAsync() instead.'
    );
  }

  async listAsync(): Promise<readonly IEffort[]> {
    const db = await this.db.getDB();
    return db.getAll('efforts');
  }

  listByOrigin(_origin: EffortRegistrySource): readonly IEffort[] {
    throw new Error(
      'IndexedDBEffortRegistry.listByOrigin is async-only. Use listByOriginAsync() instead.'
    );
  }

  async listByOriginAsync(origin: EffortRegistrySource): Promise<readonly IEffort[]> {
    const all = await this.listAsync();
    return all.filter((e) => e.registrySource === origin);
  }

  async upsert(effort: IEffort): Promise<void> {
    if (effort.registrySource !== 'user') {
      throw new Error(
        `IndexedDBEffortRegistry.upsert: only user efforts can be written. Received registrySource="${effort.registrySource}"`
      );
    }
    const db = await this.db.getDB();
    await db.put('efforts', effort);
  }

  async delete(slug: string): Promise<void> {
    const existing = await this.resolveAsync(slug);
    if (existing && existing.registrySource !== 'user') {
      throw new Error(
        `IndexedDBEffortRegistry.delete: cannot delete non-user effort "${slug}"`
      );
    }
    const db = await this.db.getDB();
    await db.delete('efforts', slug);
  }
}
