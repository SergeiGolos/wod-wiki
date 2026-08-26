/**
 * The WqlComposer pill vocabulary — types, metadata, and option lists.
 * Compilation and restore live in `./queryAst` (ticket 013): composer state
 * is the C6 AST; strings are produced only through the engine serializer.
 *
 * Source-pivot model (issue #838, decision #836): a single `source` head
 * slot — journal | collections | feeds | notes | blocks | efforts | metrics —
 * pivots the query kind. Content sources compile the `find:` skeleton; `metrics`
 * compiles the aggregate skeleton (`agg:metric{filters} by {dims}.rollup(p)
 * [in unit] [where find:…]`). The find target and scope are derived from the
 * source value (the legacy `target`/`scope` clause types are retired).
 *
 * Static option lists live here; dynamic typeahead data sources live in
 * ./suggestionSources (issue #831). All vocab is sourced from the canonical
 * modules (@bitcobblers/wod-wiki-engine) — never hardcoded in the composer (decision #824).
 *
 * Supports freeform token slots, placeholder guidance, and keyboard navigation.
 */

import { composerRegistry } from './ComposerRegistry';
import { WQL_AGGREGATORS, WQL_COMPARISON_OPS, WQL_CALC_TARGETS, WQL_DISPLAY_UNITS, WQL_METRIC_AGGREGATES, WQL_METRIC_FAMILIES, WQL_ROLLUP_PERIODS, WQL_SOURCES, WQL_TAG_KEYS, WQL_VIRTUAL_DIMS } from '@bitcobblers/wod-wiki-wql';

export type ClauseType =
  | 'source'
  | 'text'
  | 'catalog'
  | 'tag'
  | 'effort'
  | 'discipline'
  | 'intensity'
  | 'origin'
  | 'type'
  | 'has'
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
  | 'output';

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
}

// ── Source planes ───────────────────────────────────────────────────────────

/** Content sources compile `find:note in <scope>`; notes/blocks use `all`. */
export const CONTENT_SOURCES = WQL_SOURCES.filter((s) => s !== 'metrics');

/** The plane a source value belongs to — everything but `metrics` is content. */
export function sourcePlane(source: string): 'content' | 'metrics' {
  return source === 'metrics' ? 'metrics' : 'content';
}

/** Clause types that only make sense on the metrics plane. */
export const METRICS_ONLY_TYPES: ReadonlySet<string> = new Set(['agg', 'metric', 'groupby', 'rollup', 'unit']);

// ── Options & Data Sources ──────────────────────────────────────────────────

export const SOURCE_OPTIONS = [
  { value: 'journal', label: 'Journal', description: 'Find notes in the personal journal' },
  { value: 'collections', label: 'Collections', description: 'Find notes in workout catalogs' },
  { value: 'feeds', label: 'Feeds', description: 'Find notes in subscribed feeds' },
  { value: 'notes', label: 'All Notes', description: 'Find notes across every source' },
  { value: 'blocks', label: 'Blocks', description: 'Find fenced workout/dashboard regions' },
  { value: 'efforts', label: 'Efforts', description: 'Find registered efforts (bundled + custom)' },
  { value: 'metrics', label: 'Metrics', description: 'Aggregate analytics facts' },
  { value: 'rows', label: 'Sessions (rows)', description: 'Raw workout logs as per-round rows (#949)' },
];

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
export const ROLLUP_OPTIONS = WQL_ROLLUP_PERIODS.map((v) => ({
  value: v,
  label: v === '1d' ? 'Daily (1d)' : 'Weekly (1w)',
}));
export const GROUPBY_OPTIONS = [...WQL_VIRTUAL_DIMS, ...WQL_TAG_KEYS].map((v) => ({ value: v, label: v }));
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
export const WHERE_OPERATORS: readonly string[] = WQL_COMPARISON_OPS;

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

export const CLAUSE_META: Record<ClauseType, ClauseMeta> = {
  source:    { label: 'Source',     inputType: 'select',   placeholder: 'journal, notes, metrics…', placeholderText: 'source: [plane]',      icon: '🌐', description: 'What to search (notes/blocks) or aggregate (metrics)' },
  text:      { label: 'Contains',   inputType: 'freetext', placeholder: 'Text query...',              placeholderText: 'text: [query]',           icon: '🔍', description: 'Raw text substring search', prefix: 'text:' },
  catalog:   { label: 'Catalog',    inputType: 'select',   placeholder: 'Pick catalog...',            placeholderText: 'catalog: [id]',          icon: '📁', description: 'Filter by static catalog', prefix: 'catalog:' },
  tag:       { label: 'Tag',        inputType: 'select',   placeholder: 'Pick tag...',                placeholderText: 'tags: [tag]',            icon: '🏷', description: 'Filter by note/workout tags', prefix: 'tags:' },
  effort:    { label: 'Effort',     inputType: 'select',   placeholder: 'Pick effort...',             placeholderText: 'effort: [movement]',     icon: '💪', description: 'Filter by movement/workout', prefix: 'effort:' },
  discipline:{ label: 'Discipline', inputType: 'select',   placeholder: 'Pick discipline...',         placeholderText: 'discipline: [name]',     icon: '⚙', description: 'Filter by domain discipline', prefix: 'discipline:' },
  intensity: { label: 'Intensity',  inputType: 'select',   placeholder: 'low, moderate, high…',       placeholderText: 'intensity: [tier]',      icon: '🔥', description: 'Effort intensity tier', prefix: 'intensity:' },
  origin:    { label: 'Origin',     inputType: 'select',   placeholder: 'bundled, user…',             placeholderText: 'origin: [registry]',     icon: '🔖', description: 'Effort registry origin', prefix: 'origin:' },
  type:      { label: 'Block Type', inputType: 'select',   placeholder: 'wod, dashboard...',          placeholderText: 'type: [wod|heading]',    icon: '📦', description: 'Fenced block type', prefix: 'type:' },
  has:       { label: 'Has Feature',inputType: 'select',   placeholder: 'timer, image...',            placeholderText: 'has: [timer|image]',     icon: '✨', description: 'Note/block feature presence', prefix: 'has:' },
  time:      { label: 'Time Window',inputType: 'select',   placeholder: 'Time range',                 placeholderText: 'last: [time range]',      icon: '⏱', description: 'Date window (last Nw/Nd)', prefix: 'last:' },
  where:     { label: 'Metric Join',inputType: 'freetext', placeholder: 'sum:totalVolume{} > 5000',    placeholderText: 'where: [metric join]',   icon: '📊', description: 'Cross-store analytics join', prefix: 'where:' },
  agg:       { label: 'Aggregate',  inputType: 'select',   placeholder: 'sum, avg…',                  placeholderText: 'agg: [sum|avg|…]',        icon: '∑', description: 'Aggregation function' },
  metric:    { label: 'Metric',     inputType: 'select',   placeholder: 'totalVolume, reps…',         placeholderText: 'metric: [key]',           icon: '📈', description: 'Canonical metric key to aggregate' },
  groupby:   { label: 'Group By',   inputType: 'select',   placeholder: 'week, effort…',              placeholderText: 'by: [dim]',               icon: '🗂', description: 'Group results by dimension' },
  rollup:    { label: 'Rollup',     inputType: 'select',   placeholder: '1d or 1w',                   placeholderText: 'rollup: [1d|1w]',         icon: '🗓', description: 'Bucket period for rollups' },
  unit:      { label: 'Unit',       inputType: 'select',   placeholder: 'kg, lb, km…',                placeholderText: 'in: [unit]',              icon: '📏', description: 'Display unit directive' },
  result:    { label: 'Session',    inputType: 'freetext', placeholder: 'result id…',                  placeholderText: 'result: [id]',            icon: '🏁', description: 'Scope to one workout session', prefix: 'result:' },
  block:     { label: 'Block',      inputType: 'freetext', placeholder: 'block content id…',           placeholderText: 'block: [contentId]',      icon: '🧱', description: 'Scope to all versions of a block', prefix: 'block:' },
  note:      { label: 'Note',       inputType: 'freetext', placeholder: 'note id…',                    placeholderText: 'note: [id]',              icon: '📓', description: 'Scope to one note', prefix: 'note:' },
  output:    { label: 'Output Type',inputType: 'select',   placeholder: 'segment, milestone…',          placeholderText: 'rows:[type]',             icon: '📋', description: 'Output-statement type for rows queries' },
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
