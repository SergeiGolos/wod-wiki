/**
 * Effort Resolver — Analytics Boundary
 *
 * Implements IEffortResolver with exact and fuzzy alias matching.
 * Creates synthetic unresolved efforts for unmatched labels.
 *
 * @see ADR-0008 Decision 4, Decision 7
 * @see PRD-EFFORT-REGISTRY FR4, FR5
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IEffort,
  IEffortRegistry,
  IEffortResolver,
  EffortResolverOptions,
} from './types';
import { DEFAULT_RESOLVER_OPTIONS } from './types';
import { findBestFuzzyMatch, normalizeForFuzzy } from './fuzzyMatch';

function normalizeSlug(label: string): string {
  return normalizeForFuzzy(label).replace(/\s+/g, '-');
}

export class EffortResolver implements IEffortResolver {
  private options: Required<EffortResolverOptions>;

  constructor(
    private readonly registry: IEffortRegistry,
    options?: EffortResolverOptions,
  ) {
    this.options = {
      defaultMet: options?.defaultMet ?? DEFAULT_RESOLVER_OPTIONS.defaultMet,
      defaultThreshold:
        options?.defaultThreshold ?? DEFAULT_RESOLVER_OPTIONS.defaultThreshold,
    };
  }

  resolveBySlug(slug: string): IEffort | null {
    return this.registry.resolve(slug);
  }

  resolveByAlias(label: string): IEffort | null {
    const normalized = normalizeForFuzzy(label);
    for (const effort of this.registry.list()) {
      if (normalizeForFuzzy(effort.label) === normalized) return effort;
      for (const alias of effort.aliases) {
        if (normalizeForFuzzy(alias) === normalized) return effort;
      }
    }
    return null;
  }

  resolveFuzzy(
    label: string,
    options?: { threshold?: number },
  ): IEffort | null {
    const threshold = options?.threshold ?? this.options.defaultThreshold;
    const normalized = normalizeForFuzzy(label);

    // 1. Exact alias/slug match (distance 0)
    const exact = this.resolveByAlias(label);
    if (exact) return exact;

    // 2. Fuzzy alias matching
    const candidates: { alias: string; effort: IEffort }[] = [];
    for (const effort of this.registry.list()) {
      for (const alias of [effort.label, ...effort.aliases]) {
        candidates.push({ alias, effort });
      }
    }

    const best = findBestFuzzyMatch(
      normalized,
      candidates.map((c) => c.alias),
      threshold,
    );

    if (best) {
      const matched = candidates.find(
        (c) => normalizeForFuzzy(c.alias) === normalizeForFuzzy(best.target),
      );
      if (matched) {
        return matched.effort;
      }
    }

    // 3. Synthetic fallback
    return this.createSyntheticEffort(label);
  }

  list(): readonly IEffort[] {
    return this.registry.list();
  }

  /**
   * Create a synthetic unresolved effort for analytics continuity.
   * Not persisted to the registry.
   */
  private createSyntheticEffort(label: string): IEffort {
    const normalizedLabel = normalizeForFuzzy(label);
    const slug = normalizeSlug(label);
    return {
      id: `synthetic-${uuidv4()}`,
      slug,
      label: normalizedLabel,
      aliases: [normalizedLabel],
      baseAttributes: {
        met: this.options.defaultMet,
        discipline: undefined,
        intensityTier: undefined,
      },
      registrySource: 'synthetic-unresolved',
    };
  }
}
