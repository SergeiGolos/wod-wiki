/**
 * WQL vocabulary — the single owner of the WQL dictionary: aggregators,
 * comparison operators, metric families/aggregates, calc.* targets, tag
 * keys, dimensions, rollup periods, grains, sources, scopes, display units,
 * and structural keywords. Every surface that needs these words imports from
 * here (or from wql-language.ts, which re-exports this module for editor
 * consumers) rather than hand-writing its own copy — issue #871.
 *
 * The calc registry's built-in calcs (src/core/analytics/calc/seeds.ts)
 * publish exactly the `calc.*` targets listed in WQL_CALC_TARGETS; keep the
 * two in sync. User-authored calcs (#880) extend this set at runtime.
 *
 * wql-language.ts re-exports everything here; import from there when you
 * already pay for the editor, from here when you only need the words.
 */

/** Canonical Metric Key families (CONTEXT.md §Analytics). */
export const WQL_METRIC_FAMILIES = ['reps', 'distance', 'resistance', 'elapsed', 'power', 'pace'] as const;
export type WqlMetricFamily = (typeof WQL_METRIC_FAMILIES)[number];

/** Tier-2 aggregate keys written to the Analytics Store. */
export const WQL_METRIC_AGGREGATES = ['totalVolume', 'totalDistance', 'tis', 'sessionLoad'] as const;
export type WqlMetricAggregate = (typeof WQL_METRIC_AGGREGATES)[number];

/** Aggregate head operators for the analytics grammar (agg:metric{filters}). */
export const WQL_AGGREGATORS = ['sum', 'avg', 'min', 'max', 'count', 'last', 'delta'] as const;
export type WqlAggregator = (typeof WQL_AGGREGATORS)[number];

/** Comparison operators for cross-store `where` joins (#800). */
export const WQL_COMPARISON_OPS = ['>', '>=', '<', '<=', '==', '!='] as const;
export type WqlComparisonOp = (typeof WQL_COMPARISON_OPS)[number];

/** Tag keys the Query Service reads off a fact row (QueryService.factTagValue). */
export const WQL_TAG_KEYS = [
  'effort', 'discipline', 'intensity', 'note', 'page', 'origin',
  'grain', 'metric', 'block', 'result', 'tags',
] as const;
export type WqlTagKey = (typeof WQL_TAG_KEYS)[number];

/** Virtual dimensions — time buckets and stream positions, not fact fields. */
export const WQL_VIRTUAL_DIMS = ['day', 'week', 'session', 'round'] as const;
export type WqlVirtualDim = (typeof WQL_VIRTUAL_DIMS)[number];

/**
 * Canonical `calc.*` targets. The single source of truth for the set of
 * calculation metric keys: source for the composer/CM6 typeahead (#871) and
 * the dashboard's known-vs-proposed gate (src/lib/dashboard/model.ts). Must
 * match the keys the calc engine registers in
 * src/core/analytics/calc/seeds.ts (`calc.e1rm`, `calc.metMinutes`,
 * `calc.acwr`, `calc.monotony`, `calc.strain`, `calc.ctl`, `calc.atl`,
 * `calc.tsb`). NOTE: `calc.pmc` (composite {ctl, atl, tsb} series) is
 * deliberately absent — the store calc model publishes one scalar key per
 * definition, so PMC ships as the three loads (#905); a composite stays
 * 'proposed' until a dedicated series widget lands.
 */
export const WQL_CALC_TARGETS = [
  'calc.metMinutes',
  'calc.acwr',
  'calc.monotony',
  'calc.strain',
  'calc.e1rm',
  'calc.ctl',
  'calc.atl',
  'calc.tsb',
  // Wellness + capture metrics (seeds in seeds.ts): soreness/sleep/hrv are
  // user-captured passthroughs; readiness is their composite; mvcBw is
  // hang/%BW; ef is running pace ÷ HR; adherence is sessions ÷ planned;
  // pct1rm is the Epley-inverse intensity; sends count climbing sends.
  'calc.soreness',
  'calc.sleep',
  'calc.hrv',
  'calc.readiness',
  'calc.mvcBw',
  'calc.ef',
  'calc.adherence',
  'calc.pct1rm',
  'calc.sends',
] as const;
export type WqlCalcTarget = (typeof WQL_CALC_TARGETS)[number];

export const WQL_INTENSITY_TIERS = ['low', 'moderate', 'high'] as const;
export type WqlIntensityTier = (typeof WQL_INTENSITY_TIERS)[number];

export const WQL_GRAINS = ['segment', 'summary', 'rollup'] as const;
export type WqlGrain = (typeof WQL_GRAINS)[number];

/** Content-discovery query targets (find:<target>). */
export const WQL_FIND_TARGETS = ['note', 'block'] as const;
export type WqlFindTarget = (typeof WQL_FIND_TARGETS)[number];

/** Content query scopes (in <scope>). */
export const WQL_SCOPES = ['journal', 'collections', 'feeds', 'all'] as const;
export type WqlScope = (typeof WQL_SCOPES)[number];

/** Content-specific filter keys (beyond the analytics tag keys). */
export const WQL_CONTENT_FILTER_KEYS = ['type', 'text', 'has', 'source', 'catalog', ...WQL_TAG_KEYS] as const;
export type WqlContentFilterKey = (typeof WQL_CONTENT_FILTER_KEYS)[number];

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
export type WqlSource = (typeof WQL_SOURCES)[number];

/** Rollup periods the aggregate grammar accepts (wql.ts: unit d|w only). */
export const WQL_ROLLUP_PERIODS = ['1d', '1w'] as const;
export type WqlRollupPeriod = (typeof WQL_ROLLUP_PERIODS)[number];

/** Display units the app can render (analytics unit preference, kg/lb). The
 *  `in <unit>` directive accepts any word; these are the canonical options. */
export const WQL_DISPLAY_UNITS = ['kg', 'lb'] as const;
export type WqlDisplayUnit = (typeof WQL_DISPLAY_UNITS)[number];
