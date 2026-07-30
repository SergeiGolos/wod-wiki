/**
 * LibraryPage — the unified content library (`/library`). Replaces the three
 * legacy list pages (`/journal`, `/collections`, `/feeds`) and reads its
 * panel state from the URL via `useLibraryQueryState`.
 *
 * Pipeline per state change:
 *   1. panel state → WQL string via `composeWql`
 *   2. WQL → `ParsedFindQuery` via `parseQuery`
 *   3. `queryService.runFind(parsed, { range })` → `Note[]`
 *   4. `Note[]` → `Entry[]` via `toEntry` (the only place that touches sourceId)
 *   5. Render Dated Stream (Notes + Posts grouped by date) + CataloguesShelf (Sessions)
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon } from 'lucide-react'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import { toEntry, type Entry } from '../../lib/entryMapper'
import { useLibraryQueryState, type LibraryQueryState } from '../../hooks/useLibraryQueryState'
import { LibraryRow } from './LibraryRow'
import { WqlComposerPanel, composeWql } from './WqlComposerPanel'

function todayKey(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDateHeader(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Compute the { start, end } range from the panel's timePreset + customStart/End. */
function computeRange(state: LibraryQueryState['state']): { start: number; end: number } | undefined {
  if (state.timePreset === 'all' || state.timePreset === 'custom') return undefined
  // TypeScript can't narrow `state.timePreset` past the `!==` checks; use a
  // switch so each branch knows exactly which keys apply.
  const days: Record<Exclude<typeof state.timePreset, 'all' | 'custom'>, number> = {
    '1d': 1, '3d': 3, '1w': 7, '2w': 14, '4w': 28, '12w': 84, '26w': 182, '52w': 365,
  }
  const d = days[state.timePreset as Exclude<typeof state.timePreset, 'all' | 'custom'>]
  if (!d) return undefined
  const end = Date.now()
  const start = end - d * 86_400_000
  return { start, end }
}

export function LibraryPage() {
  const { state, setState } = useLibraryQueryState()
  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  const wql = useMemo(() => composeWql(state), [state])
  const range = useMemo(() => computeRange(state), [state])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const parsed = parseQuery(wql)
    if (!isFindQuery(parsed) || parsed.error) {
      if (!cancelled) {
        setEntries([])
        setLoading(false)
      }
      return
    }
    queryService
      .runFind(parsed as ParsedFindQuery, { range })
      .then(result => {
        if (cancelled) return
        setEntries(result.notes.map(toEntry))
      })
      .catch(() => {
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [wql, range])

  const dated = useMemo(
    () => entries.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [entries],
  )
  const sessions = useMemo(() => entries.filter(e => e.kind === 'session'), [entries])

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of dated) {
      const k = e.date ?? '(undated)'
      const arr = map.get(k)
      if (arr) arr.push(e)
      else map.set(k, [e])
    }
    return Array.from(map.entries())
  }, [dated])

  const sessionVisible = state.sources.session !== 'hide'
  const today = todayKey()

  return (
    <div className="bg-card flex flex-col flex-1" data-testid="library-page">
      <WqlComposerPanel
        state={state}
        onChange={setState}
        catalogs={[]}
      />

      {loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">Loading…</div>
      )}

      {!loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">
          No entries match this query.
        </div>
      )}

      {byDate.map(([date, group]) => {
        const isToday = date === today
        return (
          <div key={date} className="flex flex-col">
            <div className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2 top-[104px]">
              <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {date === '(undated)' ? 'Undated' : formatDateHeader(date)}
                {isToday && <span className="ml-2 text-primary">— Today</span>}
              </span>
            </div>
            <div className="flex flex-col gap-0 pb-1">
              {group.map(entry => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  tone={isToday && entry.kind === 'note' ? 'primary' : 'secondary'}
                />
              ))}
            </div>
          </div>
        )
      })}

      {sessionVisible && (
        <div className="flex flex-col border-t-2 border-dashed border-amber-500/30 mt-4" data-testid="static-shelf">
          <button
            type="button"
            onClick={() => setShelfOpen(o => !o)}
            className="sticky z-[5] px-6 py-2 bg-amber-500/[0.06] backdrop-blur-sm flex items-center gap-2 top-[104px] hover:bg-amber-500/[0.1] transition-colors"
          >
            <FolderIcon className="size-3 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Catalogues — Static, undated
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
              {sessions.length}
            </span>
            <span className="ml-auto">
              {shelfOpen ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
            </span>
          </button>
          {shelfOpen && (
            <div className="flex flex-col gap-0 pb-1">
              {sessions.length === 0 && (
                <div className="px-6 py-3 text-xs text-muted-foreground/50">No sessions match.</div>
              )}
              {sessions.map(entry => (
                <LibraryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
