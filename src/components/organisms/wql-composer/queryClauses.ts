/**
 * Shared query-clause model + WQL compiler for the WqlComposer.
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
 * modules (src/parser/wql-vocabulary.ts, services/analytics/query/wql.ts) —
 * never hardcoded in the composer (decision #824).
 *
 * Supports freeform token slots, placeholder guidance, and keyboard navigation.
 */

import { composerRegistry } from './ComposerRegistry'
import {
  WQL_AGGREGATORS,
  WQL_COMPARISON_OPS,
} from '@/parser/wql-vocabulary'
import {
  WQL_CALC_TARGETS,
  WQL_DISPLAY_UNITS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_ROLLUP_PERIODS,
  WQL_SOURCES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
} from '@/parser/wql-vocabulary'
import { parseWqlSuffixes, splitAtWhere } from '@/services/analytics/query/wqlSuffix'
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

export interface QueryClause {
  id: string
  /** Built-in ClauseType or a custom slot type id from the ComposerRegistry. */
  type: string
  label: string
  value: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
}

// ── Source planes ───────────────────────────────────────────────────────────

/** Content sources compile `find:note in <scope>`; notes/blocks use `all`. */
export const CONTENT_SOURCES = WQL_SOURCES.filter(s => s !== 'metrics')

/** The plane a source value belongs to — everything but `metrics` is content. */
export function sourcePlane(source: string): 'content' | 'metrics' {
  return source === 'metrics' ? 'metrics' : 'content'
}

/** Clause types that only make sense on the metrics plane. */
export const METRICS_ONLY_TYPES: ReadonlySet<string> = new Set(['agg', 'metric', 'groupby', 'rollup', 'unit'])

// ── Options & Data Sources ──────────────────────────────────────────────────

export const SOURCE_OPTIONS = [
  { value: 'journal', label: 'Journal', description: 'Find notes in the personal journal' },
  { value: 'collections', label: 'Collections', description: 'Find notes in workout catalogs' },
  { value: 'feeds', label: 'Feeds', description: 'Find notes in subscribed feeds' },
  { value: 'notes', label: 'All Notes', description: 'Find notes across every source' },
  { value: 'blocks', label: 'Blocks', description: 'Find fenced workout/dashboard regions' },
  { value: 'efforts', label: 'Efforts', description: 'Find registered efforts (bundled + custom)' },
  { value: 'metrics', label: 'Metrics', description: 'Aggregate analytics facts' },
]

export const TIME_OPTIONS = [
  { value: 'last 1d', label: 'Past 24 hours' },
  { value: 'last 1w', label: 'Past week' },
  { value: 'last 2w', label: 'Past 2 weeks' },
  { value: 'last 4w', label: 'Past month' },
  { value: 'last 12w', label: 'Past quarter' },
  { value: 'last 52w', label: 'Past year' },
  { value: 'all', label: 'All time' },
]

/** Aggregate head vocab — canonical homes (decision #824). */
export const AGG_OPTIONS = WQL_AGGREGATORS.map(v => ({ value: v, label: v }))
export const ROLLUP_OPTIONS = WQL_ROLLUP_PERIODS.map(v => ({
  value: v,
  label: v === '1d' ? 'Daily (1d)' : 'Weekly (1w)',
}))
export const GROUPBY_OPTIONS = [...WQL_VIRTUAL_DIMS, ...WQL_TAG_KEYS].map(v => ({ value: v, label: v }))
export const METRIC_OPTIONS = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS]
  .map(v => ({ value: v, label: v }))
export const UNIT_OPTIONS = WQL_DISPLAY_UNITS.map(v => ({ value: v, label: v }))

/**
 * Where-join editor vocab — the same source of truth the analytics composer
 * completes against (src/parser/wql-language.ts, aggregators from the AST
 * contract in services/analytics/query/wql.ts). Issue #831.
 */
export const WHERE_AGGREGATORS: readonly string[] = WQL_AGGREGATORS
export const WHERE_METRICS: readonly string[] = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES, ...WQL_CALC_TARGETS]
export const WHERE_OPERATORS: readonly string[] = WQL_COMPARISON_OPS

// ── Metadata ────────────────────────────────────────────────────────────────

export interface ClauseMeta {
  label: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
  placeholderText: string
  icon: string
  description: string
  prefix?: string
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
}

const CUSTOM_FALLBACK_ICON = '\u{1F9E9}'

/**
 * Metadata lookup for pills, popovers, and menus: built-in clauses come from
 * CLAUSE_META; custom slot types resolve through the ComposerRegistry;
 * anything else gets a generic fallback so a stale clause still renders.
 */
export function getClauseMeta(type: string): ClauseMeta {
  const builtin = (CLAUSE_META as Record<string, ClauseMeta>)[type]
  if (builtin) return builtin
  const custom = composerRegistry.getSlot(type)
  if (custom) {
    return {
      label: custom.label,
      inputType: 'freetext',
      placeholder: custom.placeholder,
      placeholderText: custom.placeholderText,
      icon: custom.icon,
      description: custom.description ?? '',
    }
  }
  return {
    label: type,
    inputType: 'freetext',
    placeholder: `${type}...`,
    placeholderText: `${type}: [value]`,
    icon: CUSTOM_FALLBACK_ICON,
    description: '',
  }
}

// ── WQL Generation ──────────────────────────────────────────────────────────

/**
 * Maps a single clause to its WQL fragment syntax.
 */
export function clauseToWql(clause: QueryClause): { key?: string; filterStr?: string } {
  if (!clause.value.trim()) return {}
  const val = clause.value.trim()

  switch (clause.type) {
    case 'text': {
      // Multi-word values take a quoted phrase form so they parse (#867);
      // already-quoted values pass through unchanged.
      const needsQuotes = /\s/.test(val) && !(val.startsWith('"') && val.endsWith('"'));
      return { filterStr: `text:${needsQuotes ? `"${val}"` : val}` };
    }
    case 'catalog':    return { filterStr: `catalog:${val}` }
    case 'tag':        return { filterStr: `tags:${val}` }
    case 'effort':     return { filterStr: `effort:${val}` }
    case 'discipline': return { filterStr: `discipline:${val}` }
    case 'intensity':  return { filterStr: `intensity:${val}` }
    case 'origin':     return { filterStr: `origin:${val}` }
    case 'type':       return { filterStr: `type:${val}` }
    case 'has':       return { filterStr: `has:${val}` }
    default: {
      // Custom slot types compile through their registered wqlGenerator.
      const def = composerRegistry.getSlot(clause.type)
      if (!def) return {}
      const value = def.parseValue(val)
      if (value === undefined) return {}
      const fragment = def.wqlGenerator(value)
      return fragment.trim() ? { filterStr: fragment } : {}
    }
  }
}

/**
 * Composes a full WQL string from an array of QueryClauses.
 *
 * Content planes: find:<target>{<filters>} in <scope> [last <n><unit>] [where <join>]
 *   — target/scope derived from `source` (journal|collections|feeds → note in
 *   <source>; notes → note in all; blocks → block in all; anything else →
 *   note in <verbatim value>, the salvage path for exotic scopes).
 * Metrics plane:   <agg>:<metric>{<filters>} [by {<dims>}] [.rollup(<p>)] [in <unit>] [where <find join>]
 */
export function clausesToWql(clauses: QueryClause[]): string {
  const whereClause = clauses.find(c => c.type === 'where')
  const whereStr = whereClause?.value?.trim() ? `where ${whereClause.value.trim()}` : ''

  // Filter clauses
  const filterParts: string[] = []
  for (const c of clauses) {
    const res = clauseToWql(c)
    if (res.filterStr) {
      filterParts.push(res.filterStr)
    }
  }
  const filterBraces = filterParts.length > 0 ? `{${filterParts.join(', ')}}` : ''

  const source = clauseValue(clauses, 'source', 'notes')

  if (source === 'metrics') {
    const agg = clauseValue(clauses, 'agg', 'sum')
    const metric = clauseValue(clauses, 'metric', '')
    const dims = clauses.filter(c => c.type === 'groupby' && c.value.trim()).map(c => c.value.trim())
    const rollup = clauseValue(clauses, 'rollup', '')
    const unit = clauseValue(clauses, 'unit', '')

    const byStr = dims.length ? `by {${dims.join(', ')}}` : ''
    const rollupStr = rollup ? `.rollup(${rollup})` : ''

    // Rollup attaches to the by-clause when present, to the head otherwise.
    const head = byStr
      ? `${agg}:${metric}${filterBraces}`
      : `${agg}:${metric}${filterBraces}${rollupStr}`

    return [
      head,
      `${byStr}${byStr ? rollupStr : ''}`,
      unit ? `in ${unit}` : '',
      whereStr,
    ].filter(Boolean).join(' ').trim()
  }

  const target = source === 'blocks' ? 'block' : source === 'efforts' ? 'effort' : 'note'
  const scope = source === 'notes' || source === 'blocks' || source === 'efforts' ? 'all' : source

  const timeClause = clauses.find(c => c.type === 'time')
  let timeStr = ''
  if (timeClause && timeClause.value && timeClause.value !== 'all') {
    const rawVal = timeClause.value.trim()
    timeStr = rawVal.startsWith('last') ? rawVal : `last ${rawVal}`
  }

  return [
    `find:${target}${filterBraces}`,
    `in ${scope}`,
    timeStr,
    whereStr,
  ].filter(Boolean).join(' ').trim()
}

// ── WQL → Clauses (URL restore) ─────────────────────────────────────────────

/** Built-in filter key → clause type, derived from CLAUSE_META `prefix` so a
 * new built-in filter clause is declared once (metadata) and compiled once
 * (clauseToWql). Positional head/kind clauses are not `{...}` filters, so
 * they are excluded. */
const POSITIONAL_CLAUSE_TYPES = new Set(['source', 'time', 'where', 'agg', 'metric', 'groupby', 'rollup', 'unit'])
const FILTER_KEY_TO_CLAUSE_TYPE: Record<string, ClauseType> = Object.fromEntries(
  (Object.entries(CLAUSE_META) as [ClauseType, ClauseMeta][])
    .filter(([type]) => !POSITIONAL_CLAUSE_TYPES.has(type))
    .map(([type, meta]) => [meta.prefix!.replace(/:$/, ''), type]),
)

/** Split a `{...}` body at top-level commas (depth-aware so values carrying
 * nested braces — e.g. a where-style custom fragment — stay intact). */
function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let inQuote = false
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === '"') inQuote = !inQuote
    else if (!inQuote && c === '{') depth++
    else if (!inQuote && c === '}') depth = Math.max(0, depth - 1)
    else if (!inQuote && c === ',' && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
}

/** Split at the first top-level `where` keyword (same rule as the query
 * service's parser: depth-0, word-bounded). */
export function splitWhereTail(text: string): { head: string; where?: string } {
  const { primary, where } = splitAtWhere(text)
  return { head: primary, where }
}

const RESTORE_FIND_HEAD_RE = /^find:([a-zA-Z0-9_-]*)/
const RESTORE_AGG_HEAD_RE = /^([a-zA-Z0-9_-]+):([a-zA-Z0-9_.-]*)/
function restoreClause(id: string, type: string, value: string): QueryClause {
  return { id, type, ...getClauseMeta(type), value }
}

/** Map one `{...}` filter fragment to a clause. Returns null when the
 * fragment is not composer-expressible (negation, unknown key, or a custom
 * slot whose generator does not reproduce the fragment verbatim). */
function filterFragmentToClause(fragment: string, index: number): QueryClause | null {
  if (fragment.startsWith('!')) return null
  const colon = fragment.indexOf(':')
  if (colon <= 0) return null
  const key = fragment.slice(0, colon)
  const value = fragment.slice(colon + 1)
  if (!value.trim()) return null

  const builtin = FILTER_KEY_TO_CLAUSE_TYPE[key]
  if (builtin) {
    // Unquote a quoted text phrase on restore so the chip shows the spaced
    // form, not the `"…"` literal (#867).
    const restoredValue =
      builtin === 'text' && value.length >= 2 && value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value
    return restoreClause(`c-${builtin}-${index}`, builtin, restoredValue)
  }

  // Custom slots: accept the first registered slot whose typed round-trip
  // reproduces the fragment verbatim.
  for (const slot of composerRegistry.getAllSlots()) {
    const typed = slot.parseValue(value)
    if (typed !== undefined && slot.wqlGenerator(typed) === fragment) {
      return restoreClause(`c-${slot.type}-${index}`, slot.type, slot.formatValue(typed))
    }
  }
  return null
}

/** Restore the `{...}` filter body into clauses, or null when any fragment
 * is not composer-expressible. Shared by the find and aggregate branches. */
function restoreFilters(rest: string): QueryClause[] | null {
  if (!rest) return []
  if (!rest.startsWith('{') || !rest.endsWith('}')) return null
  const body = rest.slice(1, -1)
  const fragments = splitTopLevel(body).map(f => f.trim()).filter(Boolean)
  const clauses: QueryClause[] = []
  for (let i = 0; i < fragments.length; i++) {
    const clause = filterFragmentToClause(fragments[i], i)
    if (!clause) return null
    clauses.push(clause)
  }
  return clauses
}

/**
 * Restore composer clauses from a WQL string — the inverse of
 * `clausesToWql`, used to hydrate composer state from the URL.
 *
 * Unlike `parseQuery`, this is a *salvage* parser: it mirrors the compiler's
 * structure on both planes without validating the fragments, so composer-
 * reachable states that are WQL-invalid (e.g. `text:hello world`, a `1m`
 * rollup period, an empty metric) still restore exactly — the diagnostics
 * strip then attributes the parse error to the offending slot.
 *
 * Returns null when the string cannot be a composer product: a negated
 * filter, or an unknown/custom-less filter key.
 */
export function wqlToClauses(wql: string): QueryClause[] | null {
  const suffixes = parseWqlSuffixes(wql.trim())
  const { where, displayUnit, groupBy, rollup, last, scope, primaryText } = suffixes

  if (primaryText.startsWith('find:')) {
    const headMatch = RESTORE_FIND_HEAD_RE.exec(primaryText)
    if (!headMatch) return null
    const targetValue = headMatch[1]
    const rest = primaryText.slice(headMatch[0].length).trim()

    const filterClauses = restoreFilters(rest)
    if (!filterClauses) return null

    const timeValue = last ? `last ${last.size}${last.unit}` : 'all'
    const scopeValue = scope

    // target+scope collapse into the single source slot: blocks/efforts drop
    // the scope (the engine ignores it for registry targets); an unknown
    // scope word restores verbatim so exotic scopes round-trip (salvage).
    const sourceValue = targetValue === 'block'
      ? 'blocks'
      : targetValue === 'effort'
        ? 'efforts'
        : !scopeValue || scopeValue === 'all'
          ? 'notes'
          : scopeValue

    const clauses: QueryClause[] = [
      restoreClause('c-source', 'source', sourceValue),
      restoreClause('c-time', 'time', timeValue),
      ...filterClauses,
    ]
    if (where) clauses.push(restoreClause('c-where', 'where', where))
    return clauses
  }

  // Aggregate branch: <agg>:<metric>{<filters>} [by {<dims>}] [.rollup(<p>)] [in <unit>]
  const headMatch = RESTORE_AGG_HEAD_RE.exec(primaryText)
  if (!headMatch) return null
  const aggValue = headMatch[1]
  const metricValue = headMatch[2] ?? ''
  const rest = primaryText.slice(headMatch[0].length).trim()

  const filterClauses = restoreFilters(rest)
  if (!filterClauses) return null

  const dimValues = groupBy ?? []
  const rollupValue = rollup?.raw ?? ''
  const unitValue = displayUnit ?? ''

  const clauses: QueryClause[] = [
    restoreClause('c-source', 'source', 'metrics'),
    restoreClause('c-agg', 'agg', aggValue),
    restoreClause('c-metric', 'metric', metricValue),
    ...filterClauses,
    ...dimValues.map((d, i) => restoreClause(`c-groupby-${i}`, 'groupby', d)),
  ]
  if (rollupValue) clauses.push(restoreClause('c-rollup', 'rollup', rollupValue))
  if (unitValue) clauses.push(restoreClause('c-unit', 'unit', unitValue))
  if (where) clauses.push(restoreClause('c-where', 'where', where))
  return clauses
}

// ── Source pivot ────────────────────────────────────────────────────────────

/**
 * Set the aggregate metric, re-basing the clause list on the metrics plane
 * when needed (sidebar / launcher flows, issue #839): content planes pivot
 * via `pivotClauses` (shared filters survive), a missing source or metric
 * clause is seeded, and the metric value lands on the first metric clause.
 */
export function setMetricClause(clauses: QueryClause[], metric: string): QueryClause[] {
  const withSource = clauses.some(c => c.type === 'source')
    ? clauses
    : [restoreClause('c-source', 'source', 'metrics'), ...clauses]
  const pivoted = clauseValue(withSource, 'source') === 'metrics'
    ? withSource
    : pivotClauses(withSource, 'metrics')
  return pivoted.some(c => c.type === 'metric')
    ? pivoted.map(c => (c.type === 'metric' ? { ...c, value: metric } : c))
    : [...pivoted, restoreClause('c-metric', 'metric', metric)]
}

/**
 * Re-base the clause list on a new source value (decision #836): shared
 * filter clauses survive the pivot; kind-specific clauses are dropped
 * (content plane: time/where and any metrics head; metrics plane: time/
 * where). Pivoting to metrics seeds the head slots (agg=sum, metric empty
 * for placeholder guidance).
 */
export function pivotClauses(clauses: QueryClause[], source: string): QueryClause[] {
  const next = clauses
    .filter(c => !METRICS_ONLY_TYPES.has(c.type) && c.type !== 'time' && c.type !== 'where')
    .map(c => (c.type === 'source' ? { ...c, value: source } : c))

  if (source === 'metrics') {
    const sourceIdx = next.findIndex(c => c.type === 'source')
    const head: QueryClause[] = []
    if (!next.some(c => c.type === 'agg')) head.push(restoreClause('c-agg', 'agg', 'sum'))
    if (!next.some(c => c.type === 'metric')) head.push(restoreClause('c-metric', 'metric', ''))
    next.splice(sourceIdx >= 0 ? sourceIdx + 1 : next.length, 0, ...head)
  }
  return next
}

// ── Default Clauses ─────────────────────────────────────────────────────────

export function defaultClauses(): QueryClause[] {
  return [
    { id: 'c-source', type: 'source', ...CLAUSE_META.source, value: 'notes' },
    { id: 'c-time',   type: 'time',   ...CLAUSE_META.time,   value: 'last 2w' },
  ]
}

/** Default clauses for aggregate/metrics queries (source=metrics, agg=sum, empty metric). */
export function defaultMetricsClauses(): QueryClause[] {
  return [
    { id: 'c-source', type: 'source', ...CLAUSE_META.source, value: 'metrics' },
    { id: 'c-agg',    type: 'agg',    ...CLAUSE_META.agg,    value: 'sum' },
    { id: 'c-metric', type: 'metric', ...CLAUSE_META.metric, value: '' },
  ]
}

/**
 * Value of the first clause of `type`, trimmed, or `fallback` when absent or
 * empty. Mirrors the lookup/defaulting `clausesToWql` performs, so consumers
 * (e.g. the Library shelf) share one defaulting rule with the compiler.
 */
export function clauseValue(clauses: QueryClause[], type: string, fallback = ''): string {
  return clauses.find(c => c.type === type)?.value?.trim() || fallback
}
