/**
 * Shared query-clause model + WQL compiler for the WqlComposer.
 *
 * Static option lists (target/scope/time) live here; dynamic typeahead data
 * sources live in ./suggestionSources (issue #831).
 *
 * Supports freeform token slots, placeholder guidance, and keyboard navigation.
 */

import { composerRegistry } from './ComposerRegistry'
import {
  WQL_AGGREGATORS,
  WQL_COMPARISON_OPS,
} from '@/services/analytics/query/wql'
import {
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
} from '@/parser/wql-vocabulary'

export type ClauseType =
  | 'target'
  | 'scope'
  | 'text'
  | 'catalog'
  | 'tag'
  | 'effort'
  | 'discipline'
  | 'type'
  | 'has'
  | 'time'
  | 'where'

export interface QueryClause {
  id: string
  /** Built-in ClauseType or a custom slot type id from the ComposerRegistry. */
  type: string
  label: string
  value: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
}

// ── Options & Data Sources ──────────────────────────────────────────────────

export const TARGET_OPTIONS = [
  { value: 'note', label: 'Notes', description: 'Whole markdown notes' },
  { value: 'block', label: 'Blocks', description: 'Fenced workout/dashboard regions' },
]

export const SCOPE_OPTIONS = [
  { value: 'journal', label: 'Journal', description: 'User personal notes' },
  { value: 'collections', label: 'Collections', description: 'Preloaded workout catalogs' },
  { value: 'feeds', label: 'Feeds', description: 'Subscribed feed posts' },
  { value: 'all', label: 'All Sources', description: 'Universal search across everything' },
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

/**
 * Where-join editor vocab — the same source of truth the analytics composer
 * completes against (src/parser/wql-language.ts, aggregators from the AST
 * contract in services/analytics/query/wql.ts). Issue #831.
 */
export const WHERE_AGGREGATORS: readonly string[] = WQL_AGGREGATORS
export const WHERE_METRICS: readonly string[] = [...WQL_METRIC_AGGREGATES, ...WQL_METRIC_FAMILIES]
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
  target:    { label: 'Target',     inputType: 'select',   placeholder: 'note or block',              placeholderText: 'find: [note|block]',     icon: '🎯', description: 'What to return (notes or blocks)', prefix: 'find:' },
  scope:     { label: 'Scope',      inputType: 'select',   placeholder: 'journal, collections, etc', placeholderText: 'in: [scope]',            icon: '🌐', description: 'Where to search', prefix: 'in:' },
  text:      { label: 'Contains',   inputType: 'freetext', placeholder: 'Text query...',              placeholderText: 'text: [query]',           icon: '🔍', description: 'Raw text substring search', prefix: 'text:' },
  catalog:   { label: 'Catalog',    inputType: 'select',   placeholder: 'Pick catalog...',            placeholderText: 'catalog: [id]',          icon: '📁', description: 'Filter by static catalog', prefix: 'catalog:' },
  tag:       { label: 'Tag',        inputType: 'select',   placeholder: 'Pick tag...',                placeholderText: 'tags: [tag]',            icon: '🏷', description: 'Filter by note/workout tags', prefix: 'tags:' },
  effort:    { label: 'Effort',     inputType: 'select',   placeholder: 'Pick effort...',             placeholderText: 'effort: [movement]',     icon: '💪', description: 'Filter by movement/workout', prefix: 'effort:' },
  discipline:{ label: 'Discipline', inputType: 'select',   placeholder: 'Pick discipline...',         placeholderText: 'discipline: [name]',     icon: '⚙', description: 'Filter by domain discipline', prefix: 'discipline:' },
  type:      { label: 'Block Type', inputType: 'select',   placeholder: 'wod, dashboard...',          placeholderText: 'type: [wod|heading]',    icon: '📦', description: 'Fenced block type', prefix: 'type:' },
  has:       { label: 'Has Feature',inputType: 'select',   placeholder: 'timer, image...',            placeholderText: 'has: [timer|image]',     icon: '✨', description: 'Note/block feature presence', prefix: 'has:' },
  time:      { label: 'Time Window',inputType: 'select',   placeholder: 'Time range',                 placeholderText: 'last: [time range]',      icon: '⏱', description: 'Date window (last Nw/Nd)', prefix: 'last:' },
  where:     { label: 'Metric Join',inputType: 'freetext', placeholder: 'sum:totalVolume{} > 5000',    placeholderText: 'where: [metric join]',   icon: '📊', description: 'Cross-store analytics join', prefix: 'where:' },
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
    case 'text':       return { filterStr: `text:${val}` }
    case 'catalog':    return { filterStr: `catalog:${val}` }
    case 'tag':        return { filterStr: `tags:${val}` }
    case 'effort':     return { filterStr: `effort:${val}` }
    case 'discipline': return { filterStr: `discipline:${val}` }
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
 * Syntax: find:<target>{<filters>} in <scope> [last <n><unit>] [where <join>]
 */
export function clausesToWql(clauses: QueryClause[]): string {
  const targetClause = clauses.find(c => c.type === 'target')
  const target = targetClause?.value?.trim() || 'note'

  const scopeClause = clauses.find(c => c.type === 'scope')
  const scope = scopeClause?.value?.trim() || 'journal'

  const timeClause = clauses.find(c => c.type === 'time')
  let timeStr = ''
  if (timeClause && timeClause.value && timeClause.value !== 'all') {
    const rawVal = timeClause.value.trim()
    timeStr = rawVal.startsWith('last') ? rawVal : `last ${rawVal}`
  }

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
  const scopeStr = scope ? `in ${scope}` : ''

  return [
    `find:${target}${filterBraces}`,
    scopeStr,
    timeStr,
    whereStr,
  ].filter(Boolean).join(' ').trim()
}

// ── WQL → Clauses (URL restore) ─────────────────────────────────────────────

/** Built-in filter key → clause type, derived from CLAUSE_META `prefix` so a
 * new built-in filter clause is declared once (metadata) and compiled once
 * (clauseToWql). `target`/`scope`/`time`/`where` are positional, not `{...}`
 * filters, so they are excluded. */
const POSITIONAL_CLAUSE_TYPES = new Set(['target', 'scope', 'time', 'where'])
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
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === '{') depth++
    else if (c === '}') depth = Math.max(0, depth - 1)
    else if (c === ',' && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
}

/** Split at the first top-level `where` keyword (same rule as the query
 * service's parser: depth-0, word-bounded). */
function splitWhereTail(text: string): { head: string; where?: string } {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth++
    else if (c === '}') depth = Math.max(0, depth - 1)
    else if (
      depth === 0 &&
      c === 'w' &&
      text.slice(i, i + 5) === 'where' &&
      (i === 0 || /\s/.test(text[i - 1])) &&
      (i + 5 >= text.length || /\s/.test(text[i + 5]))
    ) {
      return { head: text.slice(0, i).trim(), where: text.slice(i + 5).trim() }
    }
  }
  return { head: text.trim() }
}

const RESTORE_LAST_RE = /\s+last\s+(\d+)([dw])\s*$/i
const RESTORE_SCOPE_RE = /\s+in\s+(\w+)\s*$/
const RESTORE_HEAD_RE = /^find:(\w+)/

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
  if (builtin) return restoreClause(`c-${builtin}-${index}`, builtin, value)

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

/**
 * Restore composer clauses from a WQL string — the inverse of
 * `clausesToWql`, used to hydrate composer state from the URL.
 *
 * Unlike `parseQuery`, this is a *salvage* parser: it mirrors the compiler's
 * structure (`find:<target>{<filters>} in <scope> last <n><unit> where <join>`)
 * without validating the fragments, so composer-reachable states that are
 * WQL-invalid (e.g. `text:hello world`) still restore exactly — the
 * diagnostics strip then attributes the parse error to the offending slot.
 *
 * Returns null when the string cannot be a composer product: not a find
 * query, a negated filter, or an unknown/custom-less filter key.
 */
export function wqlToClauses(wql: string): QueryClause[] | null {
  const { head, where } = splitWhereTail(wql.trim())
  if (!head.startsWith('find:')) return null

  let text = head

  let timeValue = 'all'
  const lastMatch = RESTORE_LAST_RE.exec(text)
  if (lastMatch) {
    timeValue = `last ${lastMatch[1]}${lastMatch[2].toLowerCase()}`
    text = text.slice(0, lastMatch.index).trim()
  }

  let scopeValue = 'journal'
  const scopeMatch = RESTORE_SCOPE_RE.exec(text)
  if (scopeMatch) {
    scopeValue = scopeMatch[1]
    text = text.slice(0, scopeMatch.index).trim()
  }

  const headMatch = RESTORE_HEAD_RE.exec(text)
  if (!headMatch) return null
  const targetValue = headMatch[1]
  const rest = text.slice(headMatch[0].length).trim()

  const filterClauses: QueryClause[] = []
  if (rest) {
    if (!rest.startsWith('{') || !rest.endsWith('}')) return null
    const body = rest.slice(1, -1)
    const fragments = splitTopLevel(body).map(f => f.trim()).filter(Boolean)
    for (let i = 0; i < fragments.length; i++) {
      const clause = filterFragmentToClause(fragments[i], i)
      if (!clause) return null
      filterClauses.push(clause)
    }
  }

  const clauses: QueryClause[] = [
    restoreClause('c-target', 'target', targetValue),
    restoreClause('c-scope', 'scope', scopeValue),
    restoreClause('c-time', 'time', timeValue),
    ...filterClauses,
  ]
  if (where) clauses.push(restoreClause('c-where', 'where', where))
  return clauses
}

// ── Default Clauses ─────────────────────────────────────────────────────────

export function defaultClauses(): QueryClause[] {
  return [
    { id: 'c-target', type: 'target', ...CLAUSE_META.target, value: 'note' },
    { id: 'c-scope',  type: 'scope',  ...CLAUSE_META.scope,  value: 'journal' },
    { id: 'c-time',   type: 'time',   ...CLAUSE_META.time,   value: 'last 2w' },
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
