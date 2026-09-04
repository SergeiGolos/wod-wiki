/**
 * entryGrouping — group stream entries by date or by dynamic WQL grouping dimensions
 * (day, week, month, year, discipline, origin, kind, tag).
 *
 * Shared by QueriableStreamView and Explorer views to produce structured, navigable
 * stream sections with matching DOM IDs and TOC section links.
 */
import type { Entry } from './entryMapper'
import { todayKey, formatDateHeader } from './dateFormat'
import { getDateLocale } from './dateLocale'

export const UNDATED_KEY = '(undated)'

export interface StreamGroup {
  /** DOM id and scroll target, e.g. "date-group-2026-09-04" or "group-discipline-strength" */
  id: string
  /** Raw grouping key */
  key: string
  /** Localized human-readable label */
  label: string
  /** Whether this group represents today's date (for badge highlighting) */
  isToday?: boolean
  /** Entries in this group */
  entries: Entry[]
}

/** Legacy signature kept for existing callers and tests */
export function groupEntriesByDate(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const k = e.date ?? UNDATED_KEY
    const arr = map.get(k)
    if (arr) arr.push(e)
    else map.set(k, [e])
  }
  return Array.from(map.entries())
}

/** Parse grouping dimension from WQL query string or parsed AST */
export function parseGroupingDimension(query: string, parsed?: any): string | null {
  if (parsed && Array.isArray(parsed.groupBy) && parsed.groupBy.length > 0) {
    return String(parsed.groupBy[0]).toLowerCase()
  }
  const match = query.match(/\bby\s+\{?([a-zA-Z0-9_-]+)\}?/i)
  if (match?.[1]) {
    return match[1].toLowerCase()
  }
  return null
}

function safeSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default'
}

/**
 * Group entries by a specified dimension (date, week, month, year, discipline, origin, kind, tag).
 */
export function groupEntriesByDimension(
  entries: Entry[],
  dimension = 'date',
  options?: { shelfVisible?: boolean },
): StreamGroup[] {
  const dim = dimension.toLowerCase()
  const today = todayKey()
  const locale = getDateLocale()

  if (dim === 'date' || dim === 'day') {
    const map = new Map<string, Entry[]>()
    const undatedShelf: Entry[] = []
    const undatedPlain: Entry[] = []

    for (const e of entries) {
      if (options?.shelfVisible && (e.kind === 'session' || e.date == null)) {
        undatedShelf.push(e)
      } else if (e.date) {
        const arr = map.get(e.date)
        if (arr) arr.push(e)
        else map.set(e.date, [e])
      } else {
        undatedPlain.push(e)
      }
    }

    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
    const groups: StreamGroup[] = []

    if (options?.shelfVisible && undatedShelf.length > 0) {
      groups.push({
        id: 'group-shelf',
        key: 'shelf',
        label: 'Catalog Sessions',
        entries: undatedShelf,
      })
    }

    for (const dateKey of sortedDates) {
      groups.push({
        id: `date-group-${dateKey}`,
        key: dateKey,
        label: dateKey === today ? 'Today' : formatDateHeader(dateKey),
        isToday: dateKey === today,
        entries: map.get(dateKey) ?? [],
      })
    }

    if (undatedPlain.length > 0) {
      groups.push({
        id: 'group-date-undated',
        key: 'undated',
        label: 'Undated',
        entries: undatedPlain,
      })
    }

    return groups
  }

  if (dim === 'week') {
    const map = new Map<string, { label: string; entries: Entry[] }>()
    const undated: Entry[] = []

    for (const e of entries) {
      if (!e.date) {
        undated.push(e)
        continue
      }
      const [y, m, d] = e.date.split('-').map(Number)
      const dt = new Date(Date.UTC(y!, m! - 1, d!))
      const day = dt.getUTCDay()
      const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(Date.UTC(y!, m! - 1, diff))
      const mondayKey = monday.toISOString().slice(0, 10)
      const label = `Week of ${monday.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })}`

      const group = map.get(mondayKey)
      if (group) group.entries.push(e)
      else map.set(mondayKey, { label, entries: [e] })
    }

    const sortedWeeks = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
    const groups: StreamGroup[] = sortedWeeks.map(key => ({
      id: `group-week-${key}`,
      key,
      label: map.get(key)!.label,
      entries: map.get(key)!.entries,
    }))

    if (undated.length > 0) {
      groups.push({
        id: 'group-week-undated',
        key: 'undated',
        label: 'Undated',
        entries: undated,
      })
    }
    return groups
  }

  if (dim === 'month') {
    const map = new Map<string, { label: string; entries: Entry[] }>()
    const undated: Entry[] = []

    for (const e of entries) {
      if (!e.date) {
        undated.push(e)
        continue
      }
      const ym = e.date.slice(0, 7)
      const [y, m] = ym.split('-').map(Number)
      const label = new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })

      const group = map.get(ym)
      if (group) group.entries.push(e)
      else map.set(ym, { label, entries: [e] })
    }

    const sortedMonths = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
    const groups: StreamGroup[] = sortedMonths.map(key => ({
      id: `group-month-${key}`,
      key,
      label: map.get(key)!.label,
      entries: map.get(key)!.entries,
    }))

    if (undated.length > 0) {
      groups.push({
        id: 'group-month-undated',
        key: 'undated',
        label: 'Undated',
        entries: undated,
      })
    }
    return groups
  }

  if (dim === 'year') {
    const map = new Map<string, Entry[]>()
    const undated: Entry[] = []

    for (const e of entries) {
      if (!e.date) {
        undated.push(e)
        continue
      }
      const y = e.date.slice(0, 4)
      const arr = map.get(y)
      if (arr) arr.push(e)
      else map.set(y, [e])
    }

    const sortedYears = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
    const groups: StreamGroup[] = sortedYears.map(key => ({
      id: `group-year-${key}`,
      key,
      label: key,
      entries: map.get(key) ?? [],
    }))

    if (undated.length > 0) {
      groups.push({
        id: 'group-year-undated',
        key: 'undated',
        label: 'Undated',
        entries: undated,
      })
    }
    return groups
  }

  if (dim === 'discipline') {
    const map = new Map<string, Entry[]>()

    for (const e of entries) {
      const disc =
        e.effort?.discipline ||
        e.tags?.find(t =>
          ['strength', 'gymnastics', 'cardio', 'running', 'rowing', 'weightlifting', 'olympic-weightlifting'].includes(
            t.toLowerCase(),
          ),
        ) ||
        'General'
      const norm = disc.charAt(0).toUpperCase() + disc.slice(1).toLowerCase()
      const arr = map.get(norm)
      if (arr) arr.push(e)
      else map.set(norm, [e])
    }

    const priority = ['Strength', 'Gymnastics', 'Cardio', 'Running', 'Rowing', 'Weightlifting']
    const sorted = Array.from(map.keys()).sort((a, b) => {
      const ia = priority.indexOf(a)
      const ib = priority.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })

    return sorted.map(key => ({
      id: `group-discipline-${safeSlug(key)}`,
      key,
      label: key,
      entries: map.get(key) ?? [],
    }))
  }

  if (dim === 'origin') {
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      const origin = e.effort?.registrySource === 'bundled' ? 'Bundled Standards' : 'Custom Movements'
      const arr = map.get(origin)
      if (arr) arr.push(e)
      else map.set(origin, [e])
    }
    return Array.from(map.entries()).map(([key, groupEntries]) => ({
      id: `group-origin-${safeSlug(key)}`,
      key,
      label: key,
      entries: groupEntries,
    }))
  }

  if (dim === 'kind' || dim === 'type') {
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      const kind = e.kind.charAt(0).toUpperCase() + e.kind.slice(1) + 's'
      const arr = map.get(kind)
      if (arr) arr.push(e)
      else map.set(kind, [e])
    }
    return Array.from(map.entries()).map(([key, groupEntries]) => ({
      id: `group-kind-${safeSlug(key)}`,
      key,
      label: key,
      entries: groupEntries,
    }))
  }

  // Fallback: group by tag
  const map = new Map<string, Entry[]>()
  for (const e of entries) {
    const tag = e.tags?.[0] ? `#${e.tags[0]}` : 'Untagged'
    const arr = map.get(tag)
    if (arr) arr.push(e)
    else map.set(tag, [e])
  }
  return Array.from(map.entries()).map(([key, groupEntries]) => ({
    id: `group-tag-${safeSlug(key)}`,
    key,
    label: key,
    entries: groupEntries,
  }))
}
