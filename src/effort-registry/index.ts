/**
 * Effort Registry
 *
 * First-class domain entity system for exercise effort definitions.
 *
 * @example
 * ```typescript
 * import { CompositeEffortRegistry, EffortResolver } from '@/effort-registry';
 *
 * const registry = new CompositeEffortRegistry();
 * await registry.loadBundled();
 *
 * const resolver = new EffortResolver(registry);
 * const effort = resolver.resolveFuzzy('rwo'); // => rowing (distance 2)
 * ```
 */

// Types
export type {
  IEffort,
  IEffortRegistry,
  IEffortResolver,
  EffortRegistrySource,
  IntensityTier,
  EffortBaseAttributes,
  EffortDerivation,
  EffortResolverOptions,
} from './types';
export { DEFAULT_RESOLVER_OPTIONS } from './types';

// Data
export { bundledEfforts, BUNDLED_EFFORT_COUNT } from './data/bundled-efforts';

// Fuzzy matching
export {
  levenshteinDistance,
  normalizeForFuzzy,
  isWithinThreshold,
  findBestFuzzyMatch,
} from './fuzzyMatch';
export type { FuzzyCandidate } from './fuzzyMatch';

// Registries
export { InMemoryEffortRegistry } from './InMemoryEffortRegistry';
export { IndexedDBEffortRegistry } from './IndexedDBEffortRegistry';
export { CompositeEffortRegistry } from './CompositeEffortRegistry';

// Resolver
export { EffortResolver } from './EffortResolver';
