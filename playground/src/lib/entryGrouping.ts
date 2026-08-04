/**
 * entryGrouping — group dated stream entries by their date key, newest
 * first. Shared by the Library (batched + unbatched views) and the
 * Explorer's find-result list so both render the same date-grouped format.
 * Undated entries sort into a trailing `(undated)` group.
 */
import type { Entry } from './entryMapper'

export const UNDATED_KEY = '(undated)'

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
