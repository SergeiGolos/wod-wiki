/**
 * Shared query-clause model + data sources for WQL Search Prototypes.
 *
 * Expands WQL content query capabilities:
 *   - Target: `find:note` vs `find:block`
 *   - Scope: `journal` | `collections` | `feeds` | `all`
 *   - Filters: `text`, `catalog`, `tags`, `effort`, `discipline`, `type`, `has`
 *   - Time: `last <n>w` / `last <n>d`
 *   - Where: Cross-store analytics join (`where sum:totalVolume{} > 5000`)
 */

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
  type: ClauseType
  label: string
  value: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
}

// ── Options & Data Sources ──────────────────────────────────────────────────

export const TARGET_OPTIONS = [
  { value: 'note', label: 'Notes (find:note)' },
  { value: 'block', label: 'Blocks (find:block)' },
]

export const SCOPE_OPTIONS = [
  { value: 'journal', label: 'Journal' },
  { value: 'collections', label: 'Collections' },
  { value: 'feeds', label: 'Feeds' },
  { value: 'all', label: 'All Sources' },
]

export const CATALOG_SUGGESTIONS = [
  'crossfit-girls',
  'dan-john-40-day',
  'ZombieFit-org-2009-Dec',
  'swimming-college',
  'crossfit-programming',
]

export const TAG_SUGGESTIONS = ['PR', 'Benchmark', 'Competition', 'Long', 'Short', 'Heavy', 'Mobility', 'Hero']
export const EFFORT_SUGGESTIONS = ['Fran', 'Cindy', 'Annie', 'Helen', 'Back Squat', 'Deadlift', 'Pull-up', 'Thruster']
export const DISCIPLINE_SUGGESTIONS = ['Strength', 'Conditioning', 'Endurance', 'Gymnastics', 'Rowing', 'Swimming']
export const TYPE_SUGGESTIONS = ['wod', 'dashboard', 'heading', 'text', 'timer']
export const HAS_SUGGESTIONS = ['timer', 'image', 'metric', 'rx']

export const TIME_OPTIONS = [
  { value: 'last 1d', label: 'Past 24 hours (last 1d)' },
  { value: 'last 1w', label: 'Past week (last 1w)' },
  { value: 'last 2w', label: 'Past 2 weeks (last 2w)' },
  { value: 'last 4w', label: 'Past month (last 4w)' },
  { value: 'last 12w', label: 'Past quarter (last 12w)' },
  { value: 'last 52w', label: 'Past year (last 52w)' },
  { value: 'all', label: 'All time' },
]

export const WHERE_AGGREGATORS = ['sum', 'avg', 'min', 'max', 'count']
export const WHERE_METRICS = ['totalVolume', 'sessionLoad', 'totalReps', 'elapsed', 'totalDistance']
export const WHERE_OPERATORS = ['>', '>=', '<', '<=', '==']

// ── Metadata ────────────────────────────────────────────────────────────────

export const CLAUSE_META: Record<ClauseType, {
  label: string
  inputType: 'radio' | 'freetext' | 'select'
  placeholder: string
  icon: string
  description: string
}> = {
  target:    { label: 'Target',     inputType: 'select',   placeholder: 'note or block',              icon: '🎯', description: 'What to return (note or block)' },
  scope:     { label: 'Scope',      inputType: 'select',   placeholder: 'journal, collections, etc', icon: '🌐', description: 'Where to search' },
  text:      { label: 'Contains',   inputType: 'freetext', placeholder: 'Text query...',              icon: '🔍', description: 'Raw text substring search' },
  catalog:   { label: 'Catalog',    inputType: 'select',   placeholder: 'Pick catalog...',            icon: '📁', description: 'Filter by static catalog' },
  tag:       { label: 'Tag',        inputType: 'select',   placeholder: 'Pick tag...',                icon: '🏷', description: 'Filter by note/workout tags' },
  effort:    { label: 'Effort',     inputType: 'select',   placeholder: 'Pick effort...',             icon: '💪', description: 'Filter by movement/workout' },
  discipline:{ label: 'Discipline', inputType: 'select',   placeholder: 'Pick discipline...',         icon: '⚙', description: 'Filter by domain discipline' },
  type:      { label: 'Block Type', inputType: 'select',   placeholder: 'wod, dashboard...',          icon: '📦', description: 'Fenced block type' },
  has:       { label: 'Has Feature',inputType: 'select',   placeholder: 'timer, image...',            icon: '✨', description: 'Note/block feature presence' },
  time:      { label: 'Time Window',inputType: 'select',   placeholder: 'Time range',                 icon: '⏱', description: 'Date window (last Nw/Nd)' },
  where:     { label: 'Metric Join',inputType: 'freetext', placeholder: 'sum:totalVolume{} > 5000',    icon: '📊', description: 'Cross-store analytics join' },
}

export function getSuggestions(type: ClauseType): string[] {
  switch (type) {
    case 'target':     return TARGET_OPTIONS.map(o => o.value)
    case 'scope':      return SCOPE_OPTIONS.map(o => o.value)
    case 'catalog':    return CATALOG_SUGGESTIONS
    case 'tag':        return TAG_SUGGESTIONS
    case 'effort':     return EFFORT_SUGGESTIONS
    case 'discipline': return DISCIPLINE_SUGGESTIONS
    case 'type':       return TYPE_SUGGESTIONS
    case 'has':        return HAS_SUGGESTIONS
    case 'time':       return TIME_OPTIONS.map(o => o.value)
    case 'where':      return ['sum:totalVolume{} > 5000', 'avg:sessionLoad{} < 50', 'count:totalReps{} >= 100']
    default:           return []
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
    case 'has':        return { filterStr: `has:${val}` }
    default:           return {}
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

// ── Default Clauses ─────────────────────────────────────────────────────────

export function defaultClauses(): QueryClause[] {
  return [
    { id: 'c-target', type: 'target', ...CLAUSE_META.target, value: 'note' },
    { id: 'c-scope',  type: 'scope',  ...CLAUSE_META.scope,  value: 'journal' },
    { id: 'c-time',   type: 'time',   ...CLAUSE_META.time,   value: 'last 2w' },
  ]
}
