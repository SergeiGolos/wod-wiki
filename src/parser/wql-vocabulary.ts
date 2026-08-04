/**
 * WQL vocabulary — the pure constant tables behind wql-language.ts (the
 * CodeMirror completion source) and every other WQL surface that needs the
 * dictionary without dragging the editor bundle in (e.g. the WqlComposer
 * token-slot typeahead, issue #831).
 *
 * wql-language.ts re-exports everything here; import from there when you
 * already pay for the editor, from here when you only need the words.
 */

/** Canonical Metric Key families (CONTEXT.md §Analytics). */
export const WQL_METRIC_FAMILIES = ['reps', 'distance', 'resistance', 'elapsed', 'power', 'pace'] as const;

/** Tier-2 aggregate keys written to the Analytics Store. */
export const WQL_METRIC_AGGREGATES = ['totalVolume', 'totalDistance', 'tis', 'sessionLoad'] as const;

/** Tag keys the Query Service reads off a fact row (QueryService.factTagValue). */
export const WQL_TAG_KEYS = [
  'effort', 'discipline', 'intensity', 'note', 'page', 'origin',
  'grain', 'metric', 'block', 'result', 'tags',
] as const;

/** Virtual dimensions — time buckets and stream positions, not fact fields. */
export const WQL_VIRTUAL_DIMS = ['day', 'week', 'session', 'round'] as const;

/** Rollup Fact targets written by the lazy rollup driver (CONTEXT.md 'Rollup Fact'). */
export const WQL_CALC_TARGETS = [
  'calc.acwr',
  'calc.monotony',
  'calc.strain',
  'calc.e1rm',
  'calc.ctl',
  'calc.atl',
  'calc.tsb',
] as const;

export const WQL_INTENSITY_TIERS = ['low', 'moderate', 'high'] as const;
export const WQL_GRAINS = ['segment', 'summary', 'rollup'] as const;

/** Content-discovery query targets (find:<target>). */
export const WQL_FIND_TARGETS = ['note', 'block'] as const;

/** Content query scopes (in <scope>). */
export const WQL_SCOPES = ['journal', 'collections', 'feeds', 'all'] as const;

/** Content-specific filter keys (beyond the analytics tag keys). */
export const WQL_CONTENT_FILTER_KEYS = ['type', 'text', 'has', 'source', 'catalog', ...WQL_TAG_KEYS] as const;

/**
 * Composer source planes (issue #838, decision #836): the single `source`
 * head slot that pivots the query kind. Content sources compile the `find:`
 * skeleton; `metrics` compiles the aggregate skeleton. `efforts` compiles
 * `find:effort` against the effort registry (origin/intensity/discipline
 * vocab from src/effort-registry/types.ts). The `results` plane is
 * deliberately absent — it needs new grammar/engine semantics and is
 * deferred to its own ticket.
 */
export const WQL_SOURCES = ['journal', 'collections', 'feeds', 'notes', 'blocks', 'efforts', 'metrics'] as const;

/** Rollup periods the aggregate grammar accepts (wql.ts: unit d|w only). */
export const WQL_ROLLUP_PERIODS = ['1d', '1w'] as const;

/** Display units the app can render (analytics unit preference, kg/lb). The
 *  `in <unit>` directive accepts any word; these are the canonical options. */
export const WQL_DISPLAY_UNITS = ['kg', 'lb'] as const;
