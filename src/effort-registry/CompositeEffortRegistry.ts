import type { IEffort, IEffortRegistry, EffortRegistrySource } from './types';
import { bundledEfforts } from './data/bundled-efforts';

/**
 * Minimal shape of the IndexedDB service needed by this registry.
 */
interface DBService {
  getDB(): Promise<{
    get(store: string, key: string): Promise<unknown>;
    getAll(store: string): Promise<unknown[]>;
    put(store: string, value: unknown): Promise<string>;
    delete(store: string, key: string): Promise<void>;
  }>;
}

/**
 * Composite Effort Registry — Two-Tier Lookup
 *
 * 1. User tier: loaded from IndexedDB into memory
 * 2. Bundled tier: shipped with app as read-only seed
 *
 * Lookup order: user wins over bundled.
 * All lookups are O(1) in-memory after initialization.
 *
 * @see ADR-0008 Decision 2
 */
export class CompositeEffortRegistry implements IEffortRegistry {
  private userEfforts = new Map<string, IEffort>();
  private bundledEfforts = new Map<string, IEffort>();
  private initialized = false;
  private readonly db?: DBService;

  constructor(db?: DBService) {
    this.db = db;
  }

  private async getDb(): Promise<DBService> {
    if (this.db) return this.db;
    const { indexedDBService } = await import('@/services/db/IndexedDBService');
    return indexedDBService as DBService;
  }

  /**
   * Initialize the registry:
   * 1. Load bundled efforts into memory
   * 2. Load user efforts from IndexedDB into memory
   */
  async loadBundled(): Promise<void> {
    // Load bundled seed
    for (const effort of bundledEfforts) {
      this.bundledEfforts.set(effort.slug, effort);
    }

    // Load user efforts from IndexedDB
    try {
      const dbService = await this.getDb();
      const db = await dbService.getDB();
      const userEfforts = await db.getAll('efforts');
      for (const effort of userEfforts) {
        this.userEfforts.set((effort as IEffort).slug, effort as IEffort);
      }
    } catch (err) {
      // IndexedDB may be unavailable (Storybook, private mode, quota exceeded).
      // Continue with bundled-only; user efforts will be in-memory only.
      console.warn('[CompositeEffortRegistry] Failed to load user efforts from IndexedDB:', err);
    }

    this.initialized = true;
  }

  /** True after loadBundled() has resolved */
  isInitialized(): boolean {
    return this.initialized;
  }

  resolve(slug: string): IEffort | null {
    // User wins
    return this.userEfforts.get(slug) ?? this.bundledEfforts.get(slug) ?? null;
  }

  list(): readonly IEffort[] {
    const merged = new Map<string, IEffort>(this.bundledEfforts);
    // User overrides bundled
    for (const [slug, effort] of this.userEfforts) {
      merged.set(slug, effort);
    }
    return Array.from(merged.values());
  }

  listByOrigin(origin: EffortRegistrySource): readonly IEffort[] {
    if (origin === 'user') {
      return Array.from(this.userEfforts.values());
    }
    if (origin === 'bundled') {
      return Array.from(this.bundledEfforts.values());
    }
    return this.list().filter((e) => e.registrySource === origin);
  }

  async upsert(effort: IEffort): Promise<void> {
    if (effort.registrySource !== 'user') {
      throw new Error(
        `CompositeEffortRegistry.upsert: only user efforts can be written. Received registrySource="${effort.registrySource}"`
      );
    }

    // Update memory
    this.userEfforts.set(effort.slug, effort);

    // Persist to IndexedDB
    try {
      const dbService = await this.getDb();
      const db = await dbService.getDB();
      await db.put('efforts', effort);
    } catch (err) {
      console.warn('[CompositeEffortRegistry] Failed to persist effort to IndexedDB:', err);
      // Memory is updated; persistence is best-effort
    }
  }

  async delete(slug: string): Promise<void> {
    const existing = this.resolve(slug);
    if (existing && existing.registrySource !== 'user') {
      throw new Error(
        `CompositeEffortRegistry.delete: cannot delete non-user effort "${slug}"`
      );
    }

    // Update memory
    this.userEfforts.delete(slug);

    // Delete from IndexedDB
    try {
      const dbService = await this.getDb();
      const db = await dbService.getDB();
      await db.delete('efforts', slug);
    } catch (err) {
      console.warn('[CompositeEffortRegistry] Failed to delete effort from IndexedDB:', err);
    }
  }
}
