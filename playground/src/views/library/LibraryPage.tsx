/**
 * LibraryPage — the unified content library (`/library`). Replaces the three
 * legacy list pages (`/journal`, `/collections`, `/feeds`) and composes its
 * query with the shared `WqlComposer` organism (issue #833, decision #828).
 * Composer state round-trips through the URL via `useLibraryQueryState`.
 *
 * The page uses the standard `StickyPageHeader` — same sticky behavior and
 * action bar as the canvas and home pages. The header title is the static
 * "Library"; the per-source identity (#802) lives in the subtitle so it
 * stays visible without destabilizing the header. The composer bar is the
 * header's subheader slot (sticky on both desktop and mobile), and the
 * date-group headers stack below it via `useStickyBoundaryOffset` — no
 * hardcoded `top` values.
 *
 * The `actions` slot is optional and injected by the composition root
 * (App.tsx) as a fully-wired `PageActions`; the page renders fine without
 * it (tests, Storybook) since the action bar pulls app-wide contexts.
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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, TriangleAlertIcon } from 'lucide-react'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import {
  WqlComposer,
  clauseToWql,
  clauseValue,
  clausesToWql,
  pivotClauses,
  CLAUSE_META,
  type WqlExecutor,
} from '@/components/organisms/wql-composer'
import { type Entry } from '../../lib/entryMapper'
import { groupEntriesByDate } from '../../lib/entryGrouping'
import { searchEntries } from '../../lib/entrySearch'
import { addEntryToTodayInput } from '../../lib/addToToday'
import { useLibraryQueryState } from '../../hooks/useLibraryQueryState'
import { LibraryRow } from './LibraryRow'
import { journalNotes } from '../../services/journalNotes'
import { todayKey, formatDateHeader } from '../../lib/dateFormat'
import { useDateLocale } from '../../lib/dateLocale'
import { useBatchedItems } from '../../hooks/useBatchedItems'
import { StickyPageHeader, useStickyBoundaryOffset } from '@/panels/page-shells'
import { SourceScopeRadio, SOURCE_BY_SCOPE, SCOPE_BY_SOURCE, type LibraryScope } from './SourceScopeRadio'

/** Page subtitle keyed by the composer's source clause — the retired
 * Journal/Collections/Feeds routes redirect here with a source preselected
 * (#802), so the subtitle identifies the content the user is looking at. The
 * sticky header title itself stays the static "Library". */
const HEADING_BY_SOURCE: Record<string, { title: string; description: string }> = {
  journal:     { title: 'Journal',     description: 'Your training log — notes and results from every session.' },
  collections: { title: 'Collections', description: 'Curated workout collections, ready to run or add to today.' },
  feeds:       { title: 'Feeds',       description: 'Programming feeds you follow, newest first.' },
  notes:       { title: 'Library',     description: 'Notes, collections, and feeds — one query over everything.' },
  blocks:      { title: 'Blocks',      description: 'Fenced workout and dashboard regions across your notes.' },
  metrics:     { title: 'Metrics',     description: 'Aggregate analytics facts from your workout history.' },
}
const DEFAULT_HEADING = HEADING_BY_SOURCE.notes!

export interface LibraryPageProps {
  /**
   * Header action bar, injected by the composition root (App.tsx) as a
   * fully-wired `PageActions`. Optional so the page stays renderable in
   * isolation (tests, stories) without app-wide context providers.
   */
  actions?: ReactNode
}

export function LibraryPage({ actions }: LibraryPageProps) {
  const { clauses, setClauses, urlQueryError } = useLibraryQueryState()
  // Re-render date group headers when the "Date language" pref changes (#858).
  useDateLocale()
  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const handleAddToToday = useCallback(async (entry: Entry) => {
    const today = todayKey()
    let rawContent = ''
    if (entry.kind === 'session' || entry.kind === 'post') {
      // Static content: reassemble the note from ALL of its indexed blocks
      // in position order (#903 — the first-block-only copy cloned
      // multi-section seeds, e.g. dashboard notes, as frontmatter-only).
      const result = await queryService.runFind({
        raw: `find:block{note:${entry.id}}`,
        target: 'block',
        filters: [{ key: 'note', negate: false, values: [{ value: entry.id, wildcard: false }] }],
      } as ParsedFindQuery)
      // The block index stores the frontmatter row WITHOUT its `---`
      // fences (just the YAML body); re-wrap it so the cloned note parses
      // as a real frontmatter-bearing note — otherwise a cloned dashboard
      // seed loses `dashboard: true` and never registers. Empty rows (blank
      // line spacers) are dropped; the `\n\n` join reconstructs sections.
      rawContent = [...result.blocks]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .filter((b) => b.rawContent.trim() !== '')
        .map((b) => (b.dataType === 'frontmatter' ? `---\n${b.rawContent}\n---` : b.rawContent))
        .join('\n\n')
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

  // Scope radio owns the `source` head clause's UI (the composer hides the
  // pill via `hiddenClauseTypes`). Content→content switches keep every other
  // clause — notably the time window; only leaving the metrics plane pivots
  // (drops agg/metric/dims, decision #836).
  const handleScopeChange = useCallback((scope: LibraryScope) => {
    const source = SOURCE_BY_SCOPE[scope]
    const prev = clauseValue(clauses, 'source', 'notes')
    if (prev === source) return
    const withSource = clauses.some(c => c.type === 'source')
      ? clauses.map(c => (c.type === 'source' ? { ...c, value: source } : c))
      : [{ id: 'c-source', type: 'source' as const, ...CLAUSE_META.source, value: source }, ...clauses]
    setClauses(prev === 'metrics' ? pivotClauses(withSource, source) : withSource)
  }, [clauses, setClauses])
  // URL rejections (#854: `?q=` that couldn't restore) take precedence — the
  // composed query is the default fallback and has nothing to flag.
  const composedError = !isFindQuery(parsed) || parsed.error ? (parsed.error ?? 'Not a find query') : null
  const queryError = urlQueryError ?? composedError

  // Live stage counts (matched/selected or aggregate telemetry) in the
  // composer's diagnostics strip — dispatch on query kind. Find runs use the
  // same activity-anchored window as searchEntries (#857) so the strip's
  // counts agree with the rendered list.
  const execute = useCallback<WqlExecutor>(
    ast => (isFindQuery(ast) ? queryService.runFind(ast, { anchor: 'latest-activity' }) : queryService.runQuery(ast.raw)),
    [],
  )

  useEffect(() => {
    // Invalid composed WQL: surface the error banner and keep the last valid
    // entries rather than silently clearing the list. A URL rejection
    // (urlQueryError) still runs — the fallback default query is valid.
    if (composedError || !isFindQuery(parsed)) return
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
  }, [wql, composedError, parsed])

  const dated = useMemo(
    () => entries.filter(e => e.kind !== 'session').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [entries],
  )
  const sessions = useMemo(() => entries.filter(e => e.kind === 'session'), [entries])

  // Teaching empty state (#857, proposal 9): one-click fixes derived from the
  // active clauses, so a zero-result query never dead-ends.
  const emptyStateRemedies = useMemo(() => {
    const remedies: { id: string; label: string; apply: () => void }[] = []
    const timeClause = clauses.find(c => c.type === 'time' && c.value.trim() && c.value.trim() !== 'all')
    if (timeClause) {
      remedies.push({
        id: 'remove-window',
        label: `Remove time window (${timeClause.value.trim()})`,
        apply: () => setClauses(clauses.filter(c => c.id !== timeClause.id)),
      })
    }
    const activeFilters = clauses.filter(c => clauseToWql(c).filterStr)
    if (activeFilters.length > 0) {
      const ids = new Set(activeFilters.map(c => c.id))
      remedies.push({
        id: 'clear-filters',
        label: activeFilters.length === 1 ? 'Clear filter' : `Clear filters (${activeFilters.length})`,
        apply: () => setClauses(clauses.filter(c => !ids.has(c.id))),
      })
    }
    const sourceClause = clauses.find(c => c.type === 'source')
    if (sourceClause && sourceClause.value.trim() && sourceClause.value.trim() !== 'notes') {
      remedies.push({
        id: 'all-sources',
        label: 'Search all sources',
        apply: () => setClauses(clauses.map(c => (c.id === sourceClause.id ? { ...c, value: 'notes' } : c))),
      })
    }
    return remedies
  }, [clauses, setClauses])

  const byDate = useMemo(() => groupEntriesByDate(dated), [dated])

  // Progressive rendering (#861): the DOM only ever holds a few batches —
  // `find:block in all` is ~21k entries. Groups/counts derive from the FULL
  // set; only row rendering is batched.
  const datedBatch = useBatchedItems(dated)
  const sessionsBatch = useBatchedItems(sessions)
  const visibleByDate = useMemo(() => groupEntriesByDate(datedBatch.visible), [datedBatch.visible])
  const countByDate = useMemo(() => new Map(byDate.map(([k, group]) => [k, group.length])), [byDate])

  // Jump-to-top (#861): appears once the list scrolls away from the top.
  const [showJumpTop, setShowJumpTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowJumpTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The static shelf shows catalog sessions — relevant whenever the source
  // includes collections (or the catch-all notes source).
  const sourceValue = clauseValue(clauses, 'source', 'notes')
  const sessionVisible = sourceValue === 'collections' || sourceValue === 'notes'
  const heading = HEADING_BY_SOURCE[sourceValue] ?? DEFAULT_HEADING
  const today = todayKey()
  // Stacked-sticky offset (#861 date headers): tracks the real bottom of the
  // sticky header + composer bar instead of a hardcoded `top-[104px]`.
  const stickyOffset = useStickyBoundaryOffset(104)
  return (
    <div className="bg-card flex flex-col flex-1" data-testid="library-page">
      <StickyPageHeader
        title="Library"
        subtitle={
          <>
            <span data-testid="library-heading">{heading.title}</span>
            {' — '}
            {heading.description}
          </>
        }
        actions={actions}
        subheader={
          <div className="px-6 py-2.5 flex flex-col gap-2">
            <SourceScopeRadio scope={SCOPE_BY_SOURCE[sourceValue]} onChange={handleScopeChange} />
            <WqlComposer
              clauses={clauses}
              onClausesChange={setClauses}
              execute={execute}
              hiddenClauseTypes={['source']}
            />
          </div>
        }
      />

      {queryError && (
        <div
          className="mx-6 mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/[0.06] px-3 py-2"
          data-testid="library-query-error"
        >
          <TriangleAlertIcon className="size-3.5 mt-0.5 text-red-500 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-red-600">
              {urlQueryError ? 'Invalid URL query — showing the default query instead.' : 'Invalid WQL — fix the highlighted clause.'}
            </span>{' '}
            <code className="font-mono text-red-600/90">{queryError}</code>
          </div>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">Loading…</div>
      )}

      {!loading && !queryError && entries.length === 0 && (
        <div className="px-6 py-12 text-center text-sm" data-testid="library-empty-state">
          <p className="text-muted-foreground/50">No entries match this query.</p>
          {emptyStateRemedies.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {emptyStateRemedies.map(remedy => (
                <button
                  key={remedy.id}
                  type="button"
                  onClick={remedy.apply}
                  data-testid={`empty-remedy-${remedy.id}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {remedy.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {visibleByDate.map(([date, group]) => {
        const isToday = date === today
        return (
          <div key={date} className="flex flex-col">
            <div
              className="sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2"
              style={{ top: stickyOffset }}
            >
              <CalendarIcon className="size-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {date === '(undated)' ? 'Undated' : formatDateHeader(date)}
                {isToday && <span className="ml-2 text-primary">— Today</span>}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums" data-testid="library-group-count">
                {countByDate.get(date) ?? group.length}
              </span>
            </div>
            <div className="flex flex-col gap-0 pb-1">
              {group.map(entry => (
                <LibraryRow
                  key={entry.block ? `${entry.id}#${entry.block.segmentId}` : entry.id}
                  entry={entry}
                  dateLabel={entry.date ? formatDateHeader(entry.date) : undefined}
                  tone={isToday && entry.kind === 'note' ? 'primary' : 'secondary'}
                  onAddToToday={handleAddToToday}
                />
              ))}
            </div>
          </div>
        )
      })}

      {datedBatch.hasMore && (
        <div ref={datedBatch.sentinelRef} className="px-6 py-4 text-center text-xs text-muted-foreground/60" data-testid="library-load-more">
          Loading more — {datedBatch.total - datedBatch.visible.length} remaining…
        </div>
      )}

      {sessionVisible && (
        <div className="flex flex-col border-t-2 border-dashed border-amber-500/30 mt-4" data-testid="static-shelf">
          <button
            type="button"
            onClick={() => setShelfOpen(o => !o)}
            className="sticky z-[5] px-6 py-2 bg-amber-500/[0.06] backdrop-blur-sm flex items-center gap-2 hover:bg-amber-500/[0.1] transition-colors"
            style={{ top: stickyOffset }}
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
              {sessionsBatch.visible.map(entry => (
                <LibraryRow key={entry.block ? `${entry.id}#${entry.block.segmentId}` : entry.id} entry={entry} onAddToToday={handleAddToToday} />
              ))}
              {sessionsBatch.hasMore && (
                <div ref={sessionsBatch.sentinelRef} className="px-6 py-3 text-center text-xs text-muted-foreground/60" data-testid="library-shelf-load-more">
                  Loading more — {sessionsBatch.total - sessionsBatch.visible.length} remaining…
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showJumpTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-lg hover:text-foreground hover:bg-muted transition-colors"
          data-testid="library-jump-top"
        >
          ↑ Top
        </button>
      )}
    </div>
  )
}
