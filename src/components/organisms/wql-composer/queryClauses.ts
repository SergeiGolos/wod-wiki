/**
 * Shared query-clause model + data sources for WQL Search Prototypes.
 *
 * Supports freeform token slots, placeholder guidance, and keyboard navigation.
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
  { value: 'note', label: 'Notes', description: 'Whole markdown notes' },
  { value: 'block', label: 'Blocks', description: 'Fenced workout/dashboard regions' },
]

export const SCOPE_OPTIONS = [
  { value: 'journal', label: 'Journal', description: 'User personal notes' },
  { value: 'collections', label: 'Collections', description: 'Preloaded workout catalogs' },
  { value: 'feeds', label: 'Feeds', description: 'Subscribed feed posts' },
  { value: 'all', label: 'All Sources', description: 'Universal search across everything' },
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
  { value: 'last 1d', label: 'Past 24 hours' },
  { value: 'last 1w', label: 'Past week' },
  { value: 'last 2w', label: 'Past 2 weeks' },
  { value: 'last 4w', label: 'Past month' },
  { value: 'last 12w', label: 'Past quarter' },
  { value: 'last 52w', label: 'Past year' },
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
  placeholderText: string
  icon: string
  description: string
  prefix?: string
}> = {
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
