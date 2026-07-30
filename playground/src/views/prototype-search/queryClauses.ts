/**
 * Shared query-clause model + data sources for the palette-based prototypes.
 *
 * The query is a stack of "clauses" — each clause is one WQL fragment.
 * The palette lets the user navigate between clauses (up/down), edit
 * each clause via a combobox or radio, and add/remove clauses.
 *
 * Clause types map to WQL fragments:
 *   source    → `find:note in <scope>`
 *   text      → `text:<query>`
 *   catalog   → `catalog:<id>`
 *   tag       → `tags:<tag>`
 *   effort    → `effort:<slug>`
 *   discipline→ `discipline:<name>`
 *   time      → `last <n>w`
 *
 * Each clause knows its suggestions source, input type, and WQL fragment.
 */
import type { SearchSource } from './shared'

export type ClauseType = 'source' | 'text' | 'catalog' | 'tag' | 'effort' | 'discipline' | 'time'

export interface QueryClause {
  id: string
  type: ClauseType
  label: string
  value: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
}

export type ClauseRegistry = Record<ClauseType, Omit<QueryClause, 'value'> & {
  options?: string[]
  suggestions?: string[]
}>

// ── Data sources (prototype — hardcoded, replace with real queries) ─────────

export const SOURCE_OPTIONS = [
  { value: 'note', label: 'Notes', scope: 'journal' },
  { value: 'session', label: 'Sessions', scope: 'collections' },
  { value: 'post', label: 'Posts', scope: 'feeds' },
]

export const CATALOG_SUGGESTIONS = [
  'crossfit-girls', 'dan-john-40-day', 'ZombieFit-org-2009-Dec',
  'swimming-college', 'crossfit-programming',
]

export const TAG_SUGGESTIONS = ['PR', 'Benchmark', 'Competition', 'Long', 'Short', 'Heavy', 'Mobility']
export const EFFORT_SUGGESTIONS = ['Fran', 'Cindy', 'Annie', 'Helen', 'Back Squat', 'Deadlift', 'Pull-up']
export const DISCIPLINE_SUGGESTIONS = ['Strength', 'Conditioning', 'Endurance', 'Gymnastics', 'Rowing', 'Swimming']
export const TIME_OPTIONS = ['Today', 'Past week', 'Past 2 weeks', 'Past month', 'Past 3 months', 'Past year', 'All time']

// ── Clause type metadata ────────────────────────────────────────────────────

export const CLAUSE_META: Record<ClauseType, {
  label: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
  icon: string
}> = {
  source:    { label: 'Source',     inputType: 'radio',    placeholder: 'Notes / Sessions / Posts',  icon: '◎' },
  text:      { label: 'Contains',   inputType: 'freetext', placeholder: 'Type to search titles + bodies…', icon: '🔍' },
  catalog:   { label: 'Catalog',    inputType: 'select',   placeholder: 'Pick a catalog…',           icon: '📁' },
  tag:       { label: 'Tag',        inputType: 'select',   placeholder: 'Pick a tag…',               icon: '🏷' },
  effort:    { label: 'Effort',     inputType: 'select',   placeholder: 'Pick an effort…',           icon: '💪' },
  discipline:{ label: 'Discipline', inputType: 'select',   placeholder: 'Pick a discipline…',        icon: '⚙' },
  time:      { label: 'Time',       inputType: 'radio',    placeholder: 'Time range',                icon: '⏱' },
}

export function getSuggestions(type: ClauseType): string[] {
  switch (type) {
    case 'source':     return SOURCE_OPTIONS.map(s => s.label)
    case 'catalog':    return CATALOG_SUGGESTIONS
    case 'tag':        return TAG_SUGGESTIONS
    case 'effort':     return EFFORT_SUGGESTIONS
    case 'discipline': return DISCIPLINE_SUGGESTIONS
    case 'time':       return TIME_OPTIONS
    default:           return []
  }
}

// ── Clause → WQL fragment ───────────────────────────────────────────────────

export function clauseToWql(clause: QueryClause): string {
  switch (clause.type) {
    case 'source': {
      const src = SOURCE_OPTIONS.find(s => s.label === clause.value || s.value === clause.value)
      return src ? `in ${src.scope}` : ''
    }
    case 'text':       return clause.value ? `text:${clause.value}` : ''
    case 'catalog':    return clause.value ? `catalog:${clause.value}` : ''
    case 'tag':        return clause.value ? `tags:${clause.value}` : ''
    case 'effort':     return clause.value ? `effort:${clause.value}` : ''
    case 'discipline': return clause.value ? `discipline:${clause.value}` : ''
    case 'time': {
      const map: Record<string, string> = {
        'Today': 'last 1d', 'Past week': 'last 1w', 'Past 2 weeks': 'last 2w',
        'Past month': 'last 4w', 'Past 3 months': 'last 12w', 'Past year': 'last 52w',
        'All time': '',
      }
      return map[clause.value] ?? ''
    }
  }
}

export function clausesToWql(clauses: QueryClause[]): string {
  const sourceClause = clauses.find(c => c.type === 'source')
  const scope = sourceClause
    ? SOURCE_OPTIONS.find(s => s.label === sourceClause.value || s.value === sourceClause.value)?.scope ?? 'all'
    : 'all'

  const filters = clauses
    .filter(c => c.type !== 'source' && c.type !== 'time')
    .map(clauseToWql)
    .filter(Boolean)

  const timeClause = clauses.find(c => c.type === 'time')
  const timeStr = timeClause ? clauseToWql(timeClause) : ''

  const filterStr = filters.length ? `{${filters.join(', ')}}` : ''
  return `find:note${filterStr} in ${scope}${timeStr ? ' ' + timeStr : ''}`.trim()
}

// ── Default clause stack ────────────────────────────────────────────────────

export function defaultClauses(): QueryClause[] {
  return [
    { id: 'source', type: 'source', ...CLAUSE_META.source, value: 'Notes' },
    { id: 'time',   type: 'time',   ...CLAUSE_META.time,   value: 'Past 2 weeks' },
  ]
}
