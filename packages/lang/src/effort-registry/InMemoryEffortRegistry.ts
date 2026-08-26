import type { IEffort, IEffortRegistry, EffortRegistrySource } from './types';
import { bundledEfforts } from './data/bundled-efforts';

/**
 * In-Memory Effort Registry
 *
 * Stores all efforts in a Map indexed by slug.
 * Used for:
 * - Unit tests (deterministic, no I/O)
 * - Storybook / static builds (no IndexedDB)
 * - Bundled seed fallback
 */
export class InMemoryEffortRegistry implements IEffortRegistry {
  private efforts = new Map<string, IEffort>();
  private sourceFilter: EffortRegistrySource | null = null;

  constructor(sourceFilter?: EffortRegistrySource) {
    this.sourceFilter = sourceFilter ?? null;
  }

  /** Seed with bundled efforts */
  async loadBundled(): Promise<void> {
    for (const effort of bundledEfforts) {
      if (!this.sourceFilter || effort.registrySource === this.sourceFilter) {
        this.efforts.set(effort.slug, effort);
      }
    }
  }

  /** Seed with arbitrary efforts (useful for tests) */
  seed(efforts: readonly IEffort[]): void {
    for (const effort of efforts) {
      this.efforts.set(effort.slug, effort);
    }
  }

  /** Clear all efforts */
  clear(): void {
    this.efforts.clear();
  }

  resolve(slug: string): IEffort | null {
    return this.efforts.get(slug) ?? null;
  }

  list(): readonly IEffort[] {
    return Array.from(this.efforts.values());
  }

  listByOrigin(origin: EffortRegistrySource): readonly IEffort[] {
    return this.list().filter((e) => e.registrySource === origin);
  }

  async upsert(effort: IEffort): Promise<void> {
    if (effort.registrySource !== 'user') {
      throw new Error(
        `InMemoryEffortRegistry.upsert: only user efforts can be written. Received registrySource="${effort.registrySource}"`
      );
    }
    this.efforts.set(effort.slug, effort);
  }

  async delete(slug: string): Promise<void> {
    const existing = this.efforts.get(slug);
    if (existing && existing.registrySource !== 'user') {
      throw new Error(
        `InMemoryEffortRegistry.delete: cannot delete non-user effort "${slug}"`
      );
    }
    this.efforts.delete(slug);
  }
}
