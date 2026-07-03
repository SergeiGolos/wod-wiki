/**
 * Effort Registry — Core Types
 *
 * First-class domain entity system for exercise effort definitions.
 * Centralizes effort metadata (MET, discipline, aliases) and supports
 * user-defined derivations with coefficient chains and hard overrides.
 *
 * @see ADR-0008: Effort Registry Route Surface and Two-Pass Analytics Resolution
 * @see PRD-EFFORT-REGISTRY
 */

export type EffortRegistrySource = 'bundled' | 'user' | 'synthetic-unresolved';

export type IntensityTier = 'low' | 'moderate' | 'high';

export interface EffortBaseAttributes {
  /** Metabolic equivalent of task */
  met: number;
  /** Broad discipline category */
  discipline?: string;
  /** TIS discipline multiplier. When omitted, resolver derives it from discipline. */
  disciplineFactor?: number;
  /** Qualitative intensity bucket */
  intensityTier?: IntensityTier;
}

export interface EffortDerivation {
  /** Slug of the parent effort this was cloned from */
  parentSlug?: string;
  /** Multiplicative modifiers applied to numeric base attributes */
  coefficients?: Record<string, number>;
  /** Explicit replacement values for specific attributes */
  hardOverrides?: Record<string, unknown>;
}

/**
 * Canonical effort entity.
 *
 * The slug is the durable identity boundary. Display labels and aliases
 * may vary, but references should point at the slug.
 */
export interface IEffort {
  /** UUID */
  id: string;
  /** Canonical identifier — unique, lowercase, hyphenated */
  slug: string;
  /** Primary human-readable name */
  label: string;
  /** Alternative names for fuzzy matching */
  aliases: string[];
  /** Canonical effort attributes */
  baseAttributes: EffortBaseAttributes;
  /** Where this record came from */
  registrySource: EffortRegistrySource;
  /** Clone-based derivation metadata (user efforts only) */
  derivation?: EffortDerivation;
  /** ISO timestamp */
  createdAt?: string;
  /** ISO timestamp */
  updatedAt?: string;
  /** Free-form markdown description / notes */
  body?: string;
  /**
   * Compiler hints attached to any block resolved to this effort. Consumed by
   * strategies exactly like dialect-emitted hints — see `CONSUMED_HINTS` in
   * `core/metrics/hints.ts`. Use sparingly: any key not in `CONSUMED_HINTS`
   * is currently inert (analytics-only). For effort-specific metadata, prefer
   * a domain metric.
   */
  hints?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Registry interface (persistence + lookup)
// ---------------------------------------------------------------------------

export interface IEffortRegistry {
  // Read
  resolve(slug: string): IEffort | null;
  list(): readonly IEffort[];
  listByOrigin(origin: EffortRegistrySource): readonly IEffort[];

  // Write (user efforts only)
  upsert(effort: IEffort): Promise<void>;
  delete(slug: string): Promise<void>;

  // Bundled seed (read-only)
  loadBundled(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Resolver interface (analytics boundary)
// ---------------------------------------------------------------------------

export interface EffortResolutionOptions {
  /** Attribute metrics from /effort/:slug query params or logged execution metrics. */
  modifiers?: Record<string, string>;
  /** Fuzzy-match threshold override. */
  threshold?: number;
}

export type EffortResolvedFrom = 'user' | 'bundled' | 'default';

/**
 * Effective effort instance after alias lookup, derivation, modifiers,
 * hard overrides, fallback policy, and discipline-factor calculation.
 */
export interface ResolvedEffort {
  /** Effective effort copy; baseAttributes reflect the resolved values. */
  effort: IEffort;
  /** Original registry definition before effective attributes were materialized. */
  definition: IEffort;
  slug: string;
  label: string;
  met: number;
  /** Effective attributes mirrored for legacy metric consumers. */
  baseAttributes: EffortBaseAttributes;
  discipline?: string;
  disciplineFactor: number;
  intensityTier?: IntensityTier;
  modifiers: Record<string, string>;
  registrySource: EffortRegistrySource;
  resolvedFrom: EffortResolvedFrom;
  isEstimated: boolean;
}

export interface IEffortResolver {
  /** Exact slug lookup */
  resolveBySlug(slug: string): IEffort | null;
  /** Exact alias lookup */
  resolveByAlias(label: string): IEffort | null;
  /**
   * Fuzzy alias matching with configurable threshold.
   * Returns a synthetic unresolved effort when no match is found
   * (analytics continuity — never returns null).
   */
  resolveFuzzy(label: string, options?: { threshold?: number }): IEffort;
  /** Resolve a label/slug into an effective effort instance. */
  resolveEffort(label: string, options?: EffortResolutionOptions): ResolvedEffort;
  /** Materialize an already-found effort definition into an effective instance. */
  resolveDefinition(effort: IEffort, options?: EffortResolutionOptions): ResolvedEffort;
  /** All registered efforts (bundled + user) */
  list(): readonly IEffort[];
}

// ---------------------------------------------------------------------------
// Resolver options
// ---------------------------------------------------------------------------

export interface EffortResolverOptions {
  /** Default MET for synthetic unresolved efforts */
  defaultMet?: number;
  /** Default fuzzy-match threshold (Levenshtein distance) */
  defaultThreshold?: number;
}

export const DEFAULT_RESOLVER_OPTIONS: Required<EffortResolverOptions> = {
  defaultMet: 5.0,
  defaultThreshold: 2,
};
