import type { IEffort, IEffortRegistry, EffortRegistrySource, EffortStorageAdapter } from './types';
import { bundledEfforts as defaultBundledEfforts } from './data/bundled-efforts';

export interface CompositeEffortRegistryOptions {
  /** Custom bundled efforts to seed the read-only tier (defaults to built-in bundled efforts). */
  bundled?: Iterable<IEffort>;
  /** Optional persistence adapter for user-defined efforts. */
  storage?: EffortStorageAdapter;
}

/**
 * Composite Effort Registry — Two-Tier Lookup
 *
 * 1. User tier: loaded from storage adapter into memory
 * 2. Bundled tier: shipped as read-only seed
 *
 * Lookup order: user wins over bundled.
 * All lookups are O(1) in-memory after initialization.
 */
export class CompositeEffortRegistry implements IEffortRegistry {
  private readonly userEfforts = new Map<string, IEffort>();
  private readonly bundledEfforts = new Map<string, IEffort>();
  private initialized = false;
  private readonly initialBundled?: Iterable<IEffort>;
  private readonly storage?: EffortStorageAdapter;
  constructor(options?: CompositeEffortRegistryOptions) {
    if (options) {
      this.initialBundled = options.bundled;
      this.storage = options.storage;
    }
  }

  /**
   * Initialize the registry:
   * 1. Load bundled efforts into memory
   * 2. Load user efforts from storage adapter into memory
   */
  async loadBundled(customBundled?: Iterable<IEffort>): Promise<void> {
    const seed = customBundled ?? this.initialBundled ?? defaultBundledEfforts;
    for (const effort of seed) {
      this.bundledEfforts.set(effort.slug, effort);
    }

    if (this.storage) {
      try {
        const userEfforts = await this.storage.load();
        for (const effort of userEfforts) {
          if (effort.registrySource === 'user') {
            this.userEfforts.set(effort.slug, effort);
          }
        }
      } catch (err) {
        console.warn('[CompositeEffortRegistry] Failed to load user efforts from storage adapter:', err);
      }
    }

    this.initialized = true;
  }

  /** True after loadBundled() has resolved */
  isInitialized(): boolean {
    return this.initialized;
  }

  resolve(slug: string): IEffort | null {
    // User wins over bundled
    return this.userEfforts.get(slug) ?? this.bundledEfforts.get(slug) ?? null;
  }

  list(): readonly IEffort[] {
    const merged = new Map<string, IEffort>(this.bundledEfforts);
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

    this.userEfforts.set(effort.slug, effort);

    if (this.storage) {
      try {
        await this.storage.save(effort);
      } catch (err) {
        console.warn('[CompositeEffortRegistry] Failed to persist effort to storage adapter:', err);
      }
    }
  }

  async delete(slug: string): Promise<void> {
    const existing = this.resolve(slug);
    if (existing && existing.registrySource !== 'user') {
      throw new Error(
        `CompositeEffortRegistry.delete: cannot delete non-user effort "${slug}"`
      );
    }

    this.userEfforts.delete(slug);

    if (this.storage) {
      try {
        await this.storage.delete(slug);
      } catch (err) {
        console.warn('[CompositeEffortRegistry] Failed to delete effort from storage adapter:', err);
      }
    }
  }
}
