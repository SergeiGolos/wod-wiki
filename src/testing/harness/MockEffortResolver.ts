import type { IEffort, IEffortResolver, EffortResolverOptions } from '@/effort-registry/types';
import { DEFAULT_RESOLVER_OPTIONS } from '@/effort-registry/types';

/**
 * Mock Effort Resolver — Deterministic Test Harness
 *
 * Lightweight IEffortResolver implementation backed by an in-memory Map.
 * Injectable into AnalyticsContext for deterministic processor tests.
 *
 * @example
 * ```typescript
 * const resolver = new MockEffortResolver()
 *   .withEfforts(commonFixtureSet)
 *   .withOptions({ defaultMet: 4.0 });
 *
 * const effort = resolver.resolveBySlug('rowing');
 * const fuzzy = resolver.resolveFuzzy('rwo', { threshold: 2 });
 * ```
 */
export class MockEffortResolver implements IEffortResolver {
  private efforts = new Map<string, IEffort>();
  private options: Required<EffortResolverOptions>;

  constructor(options?: EffortResolverOptions) {
    this.options = {
      defaultMet: options?.defaultMet ?? DEFAULT_RESOLVER_OPTIONS.defaultMet,
      defaultThreshold: options?.defaultThreshold ?? DEFAULT_RESOLVER_OPTIONS.defaultThreshold,
    };
  }

  /** Seed with effort fixtures */
  withEfforts(efforts: readonly IEffort[]): this {
    for (const effort of efforts) {
      this.efforts.set(effort.slug, effort);
    }
    return this;
  }

  /** Set a specific effort by slug */
  withEffort(effort: IEffort): this {
    this.efforts.set(effort.slug, effort);
    return this;
  }

  /** Override resolver options */
  withOptions(options: EffortResolverOptions): this {
    this.options = {
      defaultMet: options.defaultMet ?? this.options.defaultMet,
      defaultThreshold: options.defaultThreshold ?? this.options.defaultThreshold,
    };
    return this;
  }

  /** Clear all efforts */
  clear(): this {
    this.efforts.clear();
    return this;
  }

  resolveBySlug(slug: string): IEffort | null {
    return this.efforts.get(slug) ?? null;
  }

  resolveByAlias(label: string): IEffort | null {
    const normalized = label.toLowerCase().trim();
    for (const effort of this.efforts.values()) {
      if (effort.label.toLowerCase().trim() === normalized) return effort;
      for (const alias of effort.aliases) {
        if (alias.toLowerCase().trim() === normalized) return effort;
      }
    }
    return null;
  }

  resolveFuzzy(label: string, options?: { threshold?: number }): IEffort {
    const threshold = options?.threshold ?? this.options.defaultThreshold;
    const normalized = label.toLowerCase().trim();

    // Exact match first
    const exact = this.resolveByAlias(label);
    if (exact) return exact;

    // Simple char-difference fuzzy for mock (deterministic, no Levenshtein dep)
    let best: { effort: IEffort; distance: number } | null = null;

    for (const effort of this.efforts.values()) {
      for (const candidate of [effort.label, ...effort.aliases]) {
        const distance = this.quickDistance(normalized, candidate.toLowerCase().trim());
        if (distance <= threshold) {
          if (!best || distance < best.distance) {
            best = { effort, distance };
          }
        }
      }
    }

    return best?.effort ?? this.createSynthetic(label);
  }

  list(): readonly IEffort[] {
    return Array.from(this.efforts.values());
  }

  /** Create a synthetic effort for unmatched labels */
  createSynthetic(label: string): IEffort {
    const slug = label.toLowerCase().trim().replace(/\s+/g, '-');
    return {
      id: `synthetic-mock-${slug}`,
      slug,
      label: label.toLowerCase().trim(),
      aliases: [label.toLowerCase().trim()],
      baseAttributes: {
        met: this.options.defaultMet,
        discipline: undefined,
        intensityTier: undefined,
      },
      registrySource: 'synthetic-unresolved',
    };
  }

  /** Quick deterministic distance — enough for test mocks */
  private quickDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Length-difference fast path
    const lenDiff = Math.abs(a.length - b.length);
    if (lenDiff > this.options.defaultThreshold) return lenDiff;

    // Simplified: count mismatched chars up to min length
    let mismatches = lenDiff;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) mismatches++;
    }
    return mismatches;
  }
}
