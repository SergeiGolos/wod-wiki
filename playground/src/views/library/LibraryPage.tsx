/**
 * LibraryPage — the unified content library (`/library`). Replaces the three
 * legacy list pages (`/journal`, `/collections`, `/feeds`) and composes its
 * query with the shared `WqlComposer` organism (issue #833, decision #828).
 * Composer state round-trips through the URL via `useLibraryQueryState`.
 *
 * Pipeline per clause change:
 *   1. clauses → WQL string via `clausesToWql`
 *   2. WQL → `ParsedFindQuery` via `parseQuery` (the AST's `last` window is
 *      applied by `runFind` itself — no client-side range math)
 *   3. `queryService.runFind(parsed)` → `Note[]`
 *   4. `Note[]` → `Entry[]` via `toEntry` (the only place that touches sourceId)
 *   5. Render Dated Stream (Notes + Posts grouped by date) + CataloguesShelf (Sessions)
 *
 * Invalid WQL (reachable e.g. via a text clause with spaces) is surfaced
 * visibly: the composer's diagnostics strip flags the offending slot, and a
 * `library-query-error` banner replaces the silent entry-clearing the old
 * panel had. The last valid entries stay on screen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, TriangleAlertIcon } from 'lucide-react'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import {
  WqlComposer,
  clauseValue,
  clausesToWql,
  type WqlExecutor,
} from '@/components/organisms/wql-composer'
import { type Entry } from '../../lib/entryMapper'
import { searchEntries } from '../../lib/entrySearch'
import { addEntryToTodayInput } from '../../lib/addToToday'
import { useLibraryQueryState } from '../../hooks/useLibraryQueryState'
import { LibraryRow } from './LibraryRow'
import { journalNotes } from '../../services/journalNotes'
import { todayKey, formatDateHeader } from '../../lib/dateFormat'

/** Page heading keyed by the composer's source clause — the retired
 * Journal/Collections/Feeds routes redirect here with a source preselected
 * (#802), so the heading identifies the content the user is looking at. */
const HEADING_BY_SOURCE: Record<string, { title: string; description: string }> = {
  journal:     { title: 'Journal',     description: 'Your training log — notes and results from every session.' },
  collections: { title: 'Collections', description: 'Curated workout collections, ready to run or add to today.' },
  feeds:       { title: 'Feeds',       description: 'Programming feeds you follow, newest first.' },
  notes:       { title: 'Library',     description: 'Notes, collections, and feeds — one query over everything.' },
  blocks:      { title: 'Blocks',      description: 'Fenced workout and dashboard regions across your notes.' },
  metrics:     { title: 'Metrics',     description: 'Aggregate analytics facts from your workout history.' },
}
const DEFAULT_HEADING = HEADING_BY_SOURCE.notes!

export function LibraryPage() {
  const { clauses, setClauses } = useLibraryQueryState()
  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const handleAddToToday = useCallback(async (entry: Entry) => {
    const today = todayKey()
    let rawContent = ''
    if (entry.kind === 'session' || entry.kind === 'post') {
      // Static content: read the first block's rawContent from the block index.
      const result = await queryService.runFind({
        raw: `find:block{note:${entry.id}}`,
        target: 'block',
        filters: [{ key: 'note', negate: false, values: [{ value: entry.id, wildcard: false }] }],
      } as ParsedFindQuery)
      rawContent = result.blocks[0]?.rawContent ?? ''
    } else {
      // Journal note: read the live note.
      const note = await journalNotes.getById(entry.sourceItem)
      if (note && typeof note === 'object' && 'rawContent' in note && typeof note.rawContent === 'string') {
        rawContent = note.rawContent
      }
    }
    const input = addEntryToTodayInput(entry, rawContent, today)
    await journalNotes.create(input)
  }, [])

  const wql = useMemo(() => clausesToWql(clauses), [clauses])
  const parsed = useMemo(() => parseQuery(wql), [wql])
  const queryError = !isFindQuery(parsed) || parsed.error ? (parsed.error ?? 'Not a find query') : null

  // Live stage counts (matched/selected or aggregate telemetry) in the
  // composer's diagnostics strip — dispatch on query kind.
  const execute = useCallback<WqlExecutor>(
    ast => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  )

  useEffect(() => {
    // Invalid WQL: surface the error banner and keep the last valid entries
    // rather than silently clearing the list.
    if (queryError || !isFindQuery(parsed)) return
    let cancelled = false
    setLoading(true)

    searchEntries(wql)
      .then(results => {
        if (!cancelled) setEntries(results)
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
  }, [wql, queryError, parsed])

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

  // The static shelf shows catalog sessions — relevant whenever the source
  // includes collections (or the catch-all notes source).
  const sourceValue = clauseValue(clauses, 'source', 'notes')
  const sessionVisible = sourceValue === 'collections' || sourceValue === 'notes'
  const heading = HEADING_BY_SOURCE[sourceValue] ?? DEFAULT_HEADING
  const today = todayKey()
  return (
    <div className="bg-card flex flex-col flex-1" data-testid="library-page">
      <header className="px-6 pt-4 pb-2">
        <h1 className="text-xl font-semibold text-foreground" data-testid="library-heading">{heading.title}</h1>
        <p className="text-sm text-muted-foreground">{heading.description}</p>
      </header>
      <div className="sticky top-0 z-[20] bg-background/95 backdrop-blur border-b border-border px-6 py-2.5">
        <WqlComposer
          clauses={clauses}
          onClausesChange={setClauses}
          execute={execute}
        />
      </div>

      {queryError && (
        <div
          className="mx-6 mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2"
          data-testid="library-query-error"
        >
          <TriangleAlertIcon className="size-3.5 mt-0.5 text-red-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-red-600">Invalid WQL — fix the highlighted clause.</span>{' '}
            <code className="font-mono text-red-600/90">{queryError}</code>
          </div>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">Loading…</div>
      )}

      {!loading && !queryError && entries.length === 0 && (
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
                  onAddToToday={handleAddToToday}
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
                <LibraryRow key={entry.id} entry={entry} onAddToToday={handleAddToToday} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
