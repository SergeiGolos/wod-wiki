/**
 * The WqlComposer pill vocabulary — types, metadata, and option lists.
 * Compilation and restore live in `./queryAst` (ticket 013): composer state
 * is the C6 AST; strings are produced only through the engine serializer.
 *
 * Canonical structure (work item 3): a query has a `kind` (find documents vs
 * measure numbers), a singular `target` (`find:<target>`), and an optional
 * `source` storage scope (`Where stored` — WQL_SOURCE_VALUES; all sources =
 * no source filter). Filter capability sets mirror what the QueryService
 * executors actually apply — parser acceptance alone never advertises a
 * clause (`has:` parses but no executor applies it, so it is not offered).
 *
 * Static option lists live here; dynamic typeahead data sources live in
 * ./suggestionSources (issue #831). All vocab is sourced from the canonical
 * modules (@bitcobblers/wod-wiki-wql) — never hardcoded in the composer (decision #824).
 *
 * Supports freeform token slots, placeholder guidance, and keyboard navigation.
 */

import { composerRegistry } from './ComposerRegistry';
import {
  WQL_AGGREGATORS,
  WQL_CALC_TARGETS,
  WQL_DISPLAY_UNITS,
  WQL_FIND_TARGETS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_RESULT_PLANES,
  WQL_SOURCE_VALUES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from '@bitcobblers/wod-wiki-wql';

export type ClauseType =
  | 'kind'
  | 'target'
  | 'source'
  | 'text'
  | 'catalog'
  | 'tag'
  | 'effort'
  | 'domain'
  | 'format'
  | 'equipment'
  | 'quality'
  | 'intent'
  | 'discipline'
  | 'intensity'
  | 'origin'
  | 'type'
  | 'time'
  | 'where'
  | 'agg'
  | 'metric'
  | 'groupby'
  | 'rollup'
  | 'unit'
  | 'result'
  | 'block'
  | 'note'
  | 'plane'
  | 'pipes';

export interface QueryClause {
  id: string;
  /** Built-in ClauseType or a custom slot type id from the ComposerRegistry. */
  type: string;
  label: string;
  value: string;
  inputType?: 'radio' | 'freetext' | 'select';
  placeholder?: string;
  icon?: string;
  prefix?: string;
  /** Index into the parsed AST's global filters array (ast.filters[filterIndex])
   *  — identifies one specific filter occurrence; editing one occurrence must
   *  never merge or rewrite another. */
  filterIndex?: number;
  /** True when this filter occurrence is negated (`!key:value`). */
  negate?: boolean;
}

// ── Canonical kind / target / scope options ────────────────────────────────

/** Query shape: `find` compiles the `find:<target>` skeleton, `aggregate`
 *  compiles `agg:metric{filters} by {dims}` and exposes agg/metric. */
export const KIND_OPTIONS = [
  { value: 'find', label: 'Find', description: 'Find things: notes, blocks, efforts, sessions, tables' },
  { value: 'aggregate', label: 'Measure', description: 'Measure numbers: aggregate a metric by dimensions' },
];

/** Singular find targets — the `find:<target>` head (C7 closed enum). */
export const TARGET_OPTIONS = WQL_FIND_TARGETS.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
  description: {
    note: 'Find notes across journal, collections and guides',
    block: 'Find fenced workout/dashboard regions',
    effort: 'Find registered movements and benchmarks',
    session: 'Find completed workout sessions',
    segment: 'Cross-workout segment table',
    event: 'Telemetry events table',
  }[t],
}));

/** Storage scopes — the `source:` filter values (`Where stored`). All
 *  sources means no source filter at all. */
export const SOURCE_OPTIONS = WQL_SOURCE_VALUES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
  description: {
    journal: 'Daily journal notes',
    collections: 'Curated collection notes',
    feeds: 'Imported feed notes',
    guides: 'Static guide pages',
    playground: 'Playground scratch pages',
  }[s],
}));

/** Output-statement planes for `plane:` on find:session (executor narrows
 *  events by the promoted `outputType` column). */
export const PLANE_OPTIONS = WQL_RESULT_PLANES.map((v) => ({ value: v, label: v }));

// ── Executor-backed filter capabilities (work item 3) ──────────────────────
// Each set lists the clause types the target's QueryService executor actually
// applies — never merely what the parser accepts. Structural types appear
// only where their consumer honors them (grouping on aggregate + card/table
// consumers; joins only where applyMetricJoin runs; no time on find:effort,
// whose registry has no time dimension and whose parser advises the ignore).

/** find:note (runFind): content/tag/text filters, source scope, join. */
const NOTE_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  text: true, catalog: true, tag: true, effort: true, domain: true, format: true,
  equipment: true, quality: true, intent: true, type: true, time: true,
  source: true, note: true, groupby: true, where: true,
};

/** find:block (runFindBlock): note-parented filters, source scope, join. */
const BLOCK_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  text: true, catalog: true, tag: true, effort: true, type: true, time: true,
  source: true, note: true, groupby: true, where: true,
};

/** find:effort (runFindEffort): exactly WQL_EFFORT_FILTER_KEYS — the
 *  registry has no time dimension (parser advises `ignores the window`). */
const EFFORT_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  text: true, effort: true, discipline: true, intensity: true, origin: true,
};

/** find:session (runFindSession): scope keys, plane narrowing (applied),
 *  window — tag filters are ignored by this executor. */
const SESSION_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  result: true, block: true, note: true, plane: true, time: true,
};

/** find:segment / find:event (runFindTable): scope keys, window, fact-backed
 *  tag filters via matchesFilters, grouping, and displayUnit (numeric column
 *  conversion). No plane — this executor explicitly excludes it; no join —
 *  not applied here. */
const TABLE_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  result: true, block: true, note: true, time: true, groupby: true, unit: true,
  tag: true, effort: true, domain: true, format: true, equipment: true,
  quality: true, intent: true, discipline: true, intensity: true, origin: true,
};

/** Aggregate heads (run/runJoined): fact-resolvable tag keys, window,
 *  grouping/rollup/unit and the where find-join. */
const AGGREGATE_FILTER_TABLE: Partial<Record<ClauseType, true>> = {
  tag: true, effort: true, domain: true, format: true, equipment: true,
  quality: true, intent: true, discipline: true, intensity: true, origin: true,
  time: true, groupby: true, rollup: true, unit: true, where: true,
  agg: true, metric: true,
};

const NOTE_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(NOTE_FILTER_TABLE));
const BLOCK_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(BLOCK_FILTER_TABLE));
const EFFORT_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(EFFORT_FILTER_TABLE));
const SESSION_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(SESSION_FILTER_TABLE));
const TABLE_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(TABLE_FILTER_TABLE));
const AGGREGATE_FILTER_TYPES: ReadonlySet<string> = new Set(Object.keys(AGGREGATE_FILTER_TABLE));

const TARGET_FILTER_TYPES: Record<string, ReadonlySet<string>> = {
  note: NOTE_FILTER_TYPES,
  block: BLOCK_FILTER_TYPES,
  effort: EFFORT_FILTER_TYPES,
  session: SESSION_FILTER_TYPES,
  segment: TABLE_FILTER_TYPES,
  event: TABLE_FILTER_TYPES,
};

/** Clause types valid for a query shape — the union of parser acceptance and
 *  real executor support. `family: 'aggregate'` ignores the target. */
export function allowedFilterTypesForTarget(target: string, family: 'find' | 'aggregate'): ReadonlySet<string> {
  if (family === 'aggregate') return AGGREGATE_FILTER_TYPES;
  return TARGET_FILTER_TYPES[target] ?? NOTE_FILTER_TYPES;
}

// ── Options & Data Sources ──────────────────────────────────────────────────

export const TIME_OPTIONS = [
  { value: 'last 1d', label: 'Past 24 hours' },
  { value: 'last 1w', label: 'Past week' },
  { value: 'last 2w', label: 'Past 2 weeks' },
  { value: 'last 4w', label: 'Past month' },
  { value: 'last 12w', label: 'Past quarter' },
  { value: 'last 52w', label: 'Past year' },
  { value: 'all', label: 'All time' },
];

/** Aggregate head vocab — canonical homes (decision #824). */
export const AGG_OPTIONS = WQL_AGGREGATORS.map((v) => ({ value: v, label: v }));
/** Multi-unit bucket widths — parse accepts any `N>1` + d|w (single-unit
 *  day/week grouping is `by {day}`/`by {week}`, never `.rollup(1w)`); the
 *  list is common suggestions, typed widths are parser-validated. */
export const ROLLUP_OPTIONS = [
  { value: '2d', label: '2 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '2w', label: '2 weeks' },
  { value: '4w', label: '4 weeks' },
  { value: '12w', label: '12 weeks' },
  { value: '26w', label: '26 weeks' },
  { value: '52w', label: '52 weeks' },
];
export const GROUPBY_OPTIONS = [...WQL_VIRTUAL_DIMS, ...WQL_TAG_KEYS].map((v) => ({ value: v, label: v }));
export const CONTENT_GROUPING_DIMENSIONS = ['date', 'day', 'week', 'month', 'year', 'discipline', 'origin', 'source', 'kind', 'type', 'tag'] as const;
export const METRIC_OPTIONS = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS]
  .map((v) => ({ value: v, label: v }));
export const UNIT_OPTIONS = WQL_DISPLAY_UNITS.map((v) => ({ value: v, label: v }));

/**
 * Where-join editor vocab — the same source of truth the analytics composer
 * completes against (src/parser/wql-language.ts, aggregators from the AST
 * contract in services/analytics/query/wql.ts). Issue #831.
 */
export const WHERE_AGGREGATORS: readonly string[] = WQL_AGGREGATORS;
export const WHERE_METRICS: readonly string[] = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS];

// ── Metadata ────────────────────────────────────────────────────────────────

export interface ClauseMeta {
  label: string;
  inputType: 'radio' | 'freetext' | 'select';
  placeholder: string;
  placeholderText: string;
  icon: string;
  description: string;
  prefix?: string;
  required?: boolean;
}

/** Structural pills seeded onto every query (queryAst seeding) — they clear
 *  back to an empty value instead of being removed. */
export const CLEAR_ONLY_TYPES: Record<string, true> = { source: true, time: true };

export const CLAUSE_META: Record<ClauseType, ClauseMeta> = {
  kind:      { label: 'Kind',       inputType: 'radio',    placeholder: 'find, measure…',              placeholderText: 'Find | Measure',         icon: '🧭', description: 'Find things or measure numbers' },
  target:    { label: 'Find',       inputType: 'select',   placeholder: 'note, block, effort…',        placeholderText: 'find: [target]',         icon: '🎯', description: 'What to find — singular', prefix: 'find:' },
  source:    { label: 'Where stored', inputType: 'select', placeholder: 'journal, collections…',       placeholderText: 'source: [scope]',        icon: '🌐', description: 'Storage scope — all sources means no scope', prefix: 'source:' },
  text:      { label: 'Contains',   inputType: 'freetext', placeholder: 'Text query...',              placeholderText: 'text: [query]',           icon: '🔍', description: 'Raw text substring search', prefix: 'text:' },
  catalog:   { label: 'Catalog',    inputType: 'select',   placeholder: 'Pick catalog...',            placeholderText: 'catalog: [id]',          icon: '📁', description: 'Filter by static catalog', prefix: 'catalog:' },
  tag:       { label: 'Tag',        inputType: 'select',   placeholder: 'Pick tag...',                placeholderText: 'tags: [tag]',            icon: '🏷', description: 'Filter by note/workout tags', prefix: 'tags:' },
  effort:    { label: 'Effort',     inputType: 'select',   placeholder: 'Pick effort...',             placeholderText: 'effort: [movement]',     icon: '💪', description: 'Filter by movement/workout', prefix: 'effort:' },
  domain:    { label: 'Domain',     inputType: 'select',   placeholder: 'crossfit, parkour, swimming…',placeholderText: 'domain: [discipline]',   icon: '🌐', description: 'Filter by sport/training domain', prefix: 'domain:' },
  format:    { label: 'Format',     inputType: 'select',   placeholder: 'for-time, amrap, emom…',      placeholderText: 'format: [shape]',        icon: '⏱', description: 'Filter by session time structure', prefix: 'format:' },
  equipment: { label: 'Equipment',  inputType: 'select',   placeholder: 'kettlebell, barbell…',        placeholderText: 'equipment: [gear]',      icon: '🏋', description: 'Filter by required gear', prefix: 'equipment:' },
  quality:   { label: 'Quality',    inputType: 'select',   placeholder: 'strength, conditioning…',     placeholderText: 'quality: [stimulus]',    icon: '⚡', description: 'Filter by physical stimulus', prefix: 'quality:' },
  intent:    { label: 'Intent',     inputType: 'select',   placeholder: 'benchmark, competition…',     placeholderText: 'intent: [tier]',         icon: '🎯', description: 'Filter by protocol status', prefix: 'intent:' },
  discipline:{ label: 'Discipline', inputType: 'select',   placeholder: 'Pick discipline...',         placeholderText: 'discipline: [name]',     icon: '⚙', description: 'Filter by domain discipline', prefix: 'discipline:' },
  intensity: { label: 'Intensity',  inputType: 'select',   placeholder: 'low, moderate, high…',       placeholderText: 'intensity: [tier]',      icon: '🔥', description: 'Effort intensity tier', prefix: 'intensity:' },
  origin:    { label: 'Origin',     inputType: 'select',   placeholder: 'bundled, user…',             placeholderText: 'origin: [registry]',     icon: '🔖', description: 'Effort registry origin', prefix: 'origin:' },
  type:      { label: 'Block Type', inputType: 'select',   placeholder: 'wod, dashboard...',          placeholderText: 'type: [wod|heading]',    icon: '📦', description: 'Fenced block type', prefix: 'type:' },
  time:      { label: 'Time Window',inputType: 'select',   placeholder: 'Time range',                 placeholderText: 'last: [time range]',      icon: '⏱', description: 'Date window (last Nw/Nd)', prefix: 'last:' },
  where:     { label: 'Metric Join',inputType: 'freetext', placeholder: 'sum:totalVolume{} > 5000',    placeholderText: 'where: [metric join]',   icon: '📊', description: 'Cross-store analytics join', prefix: 'where:' },
  agg:       { label: 'Aggregate',  inputType: 'select',   placeholder: 'sum, avg…',                  placeholderText: 'agg: [sum|avg|…]',        icon: '∑', description: 'Aggregation function' },
  metric:    { label: 'Metric',     inputType: 'select',   placeholder: 'totalVolume, reps…',         placeholderText: 'metric: [key]',           icon: '📈', description: 'Canonical metric key to aggregate' },
  groupby:   { label: 'Group By',   inputType: 'select',   placeholder: 'week, effort…',              placeholderText: 'by: [dim]',               icon: '🗂', description: 'Group results by dimension' },
  rollup:    { label: 'Rollup',     inputType: 'select',   placeholder: '2w, 4w, 12w…',               placeholderText: 'rollup: [period]',        icon: '🗓', description: 'Multi-unit bucket period (by {week}/by {day} for 1-unit)' },
  unit:      { label: 'Unit',       inputType: 'select',   placeholder: 'kg, lb, km…',                placeholderText: 'in: [unit]',              icon: '📏', description: 'Display unit directive' },
  result:    { label: 'Session',    inputType: 'freetext', placeholder: 'result id…',                  placeholderText: 'result: [id]',            icon: '🏁', description: 'Scope to one workout session', prefix: 'result:' },
  block:     { label: 'Block',      inputType: 'freetext', placeholder: 'block content id…',           placeholderText: 'block: [contentId]',      icon: '🧱', description: 'Scope to all versions of a block', prefix: 'block:' },
  note:      { label: 'Note',       inputType: 'freetext', placeholder: 'note id…',                    placeholderText: 'note: [id]',              icon: '📓', description: 'Scope to one note', prefix: 'note:' },
  plane:     { label: 'Output Plane',inputType: 'select',   placeholder: 'segment, load, event…',       placeholderText: 'plane: [type]',           icon: '📋', description: 'Output-statement plane on find:session', prefix: 'plane:' },
  pipes:     { label: 'Pipes',      inputType: 'freetext', placeholder: '| order by date | limit 10',  placeholderText: '| select | order | limit', icon: '⇥', description: 'Presentation pipes — select/order/limit/offset' },
};

const CUSTOM_FALLBACK_ICON = '\u{1F9E9}';

/**
 * Metadata lookup for pills, popovers, and menus: built-in clauses come from
 * CLAUSE_META; custom slot types resolve through the ComposerRegistry;
 * anything else gets a generic fallback so a stale clause still renders.
 */
export function getClauseMeta(type: string): ClauseMeta {
  const builtin = (CLAUSE_META as Record<string, ClauseMeta>)[type];
  if (builtin) return builtin;
  const custom = composerRegistry.getSlot(type);
  if (custom) {
    return {
      label: custom.label,
      inputType: 'freetext',
      placeholder: custom.placeholder,
      placeholderText: custom.placeholderText,
      icon: custom.icon,
      description: custom.description ?? '',
    };
  }
  return {
    label: type,
    inputType: 'freetext',
    placeholder: `${type}...`,
    placeholderText: `${type}: [value]`,
    icon: CUSTOM_FALLBACK_ICON,
    description: '',
  };
}
