/**
 * IFieldCatalog — the consumer interface for field discovery (wayfinder
 * datadog-analytics ticket 15, per the field discovery contract: typeahead
 * reads catalog indexes with bounded result counts and NEVER scans event or
 * result history; the query package performs no browser-storage access — the
 * app injects an implementation over the V17 stores).
 */

/** One typed field variant as surfaced to authoring surfaces. */
export interface CatalogFieldSuggestion {
  /** Typed field identity (collision-free key). */
  id: string;
  /** Normalized full path. */
  path: string;
  kind: string;
  /** Physical/named dimension of a numeric variant, when known. */
  dimension?: string;
  /** Observed effective units (original spellings as context). */
  units: readonly string[];
  /** Observed original spellings (provenance context). */
  spellings: readonly string[];
}

/** One observed categorical value of a field (original spelling kept). */
export interface CatalogValueSuggestion {
  fieldId: string;
  value: string;
}

export interface IFieldCatalog {
  /**
   * Bounded normalized-path prefix listing for field typeahead. Implementations
   * MUST serve it from the catalog index — never from event/result scans — and
   * MUST cap results at `limit` (narrower prefixes reveal further suggestions
   * rather than silently claiming the page is the whole vocabulary).
   */
  listByPrefix(prefix: string, limit?: number): Promise<CatalogFieldSuggestion[]>;

  /** Typed-variant lookup by exact normalized path — all variants of the path
   *  (e.g. numeric and text `score`), for `field(...)` alternatives. */
  lookup(path: string): Promise<CatalogFieldSuggestion[]>;

  /** Bounded categorical-value prefix lookup scoped to one field path. */
  listValues(path: string, valuePrefix: string, limit?: number): Promise<CatalogValueSuggestion[]>;

  /**
   * Change notification — catalog commits signal interested consumers so new
   * fields appear without reload (invalidation wiring lands with ticket 20).
   * Returns an unsubscribe function.
   */
  onChange?(listener: () => void): () => void;
}
