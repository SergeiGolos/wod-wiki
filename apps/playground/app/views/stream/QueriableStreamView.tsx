/**
 * QueriableStreamView — unified deep queriable stream across notes, efforts, and results (Ticket 003).
 *
 * Consolidates LibraryPage and EffortsCatalogPage into a single reusable view:
 * 1. Takes a StreamProfile (route, default WQL query, title, subtitle, scope lock, level).
 * 2. Connects to StreamQueryEngine for unified execution across content, efforts, and rows.
 * 3. Renders either the progressive Date Group Stream or the Property Table based on ViewSettings.
 * 4. Provides a discrete "View Settings" modal dialog (sliders button in action bar).
 * 5. Preserves all sticky boundaries, DOM batching, and search palette integrations.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  SlidersHorizontal,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import { queryService } from '@/services/queryService'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-engine'
import { WqlComposer, type WqlExecutor } from '@bitcobblers/wod-wiki-ui'
import { StickyPageHeader, useStickyBoundaryOffset } from '@/panels/page-shells'
import type { Entry } from '../../lib/entryMapper'
import { groupEntriesByDate } from '../../lib/entryGrouping'
import { defaultStreamQueryEngine, StreamQueryEngine } from '../../lib/entrySearch'
import { useComposerQueryState } from '../../hooks/useComposerQueryState'
import { useViewSettings } from '../../lib/viewSettingsStorage'
import { useDateLocale } from '../../lib/dateLocale'
import { useBatchedItems, type BatchedItems } from '../../hooks/useBatchedItems'
import { todayKey, formatDateHeader } from '../../lib/dateFormat'
import { pivotSourceQuery, sourceOfQuery, withoutFilters, withoutWindow } from '../../lib/wqlEdits'
import { SourceScopeRadio, SOURCE_BY_SCOPE, SCOPE_BY_SOURCE, type LibraryScope } from '../library/SourceScopeRadio'
import { LibraryRow } from '../library/LibraryRow'
import { PropertyTable } from './PropertyTable'
import { ViewSettingsDialog } from './ViewSettingsDialog'
import { journalNotes } from '../../services/journalNotes'
import { addEntryToTodayInput } from '../../lib/addToToday'
import type { StreamProfile } from './streamProfile'

function BatchingSentinel({
  batch,
  testId = 'stream-load-more',
}: {
  batch: BatchedItems<unknown>
  testId?: string
}) {
  if (!batch.hasMore) return null
  return (
    <div
      ref={batch.sentinelRef}
      className="px-6 py-4 text-center text-xs text-muted-foreground/60"
      data-testid={testId}
    >
      Loading more — {batch.total - batch.visible.length} remaining…
    </div>
  )
}

export interface QueriableStreamViewProps {
  /** Configuration profile for this stream route. */
  profile: StreamProfile
  /** Optional custom action buttons rendered in the header action bar. */
  actions?: ReactNode
  /** Optional custom query engine (defaults to defaultStreamQueryEngine). */
  queryEngine?: StreamQueryEngine
  /** Optional Add-to-today handler for cards. */
  onAddToToday?: (entry: Entry) => void
}

export function QueriableStreamView({
  profile,
  actions,
  queryEngine,
  onAddToToday,
}: QueriableStreamViewProps) {
  // Synchronize composer state with URL
  const { query, setQuery, urlQueryError } = useComposerQueryState({
    defaultQuery: () => profile.defaultWql,
    legacy: profile.legacy,
  })

  // Per-route view settings (layout + field visibility)
  const { settings, setLayout, toggleField, resetSettings } = useViewSettings(
    profile.route,
    profile.level,
  )

  useDateLocale()

  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [liveWql, setLiveWql] = useState<string | null>(null)

  const activeWql = liveWql ?? query
  const parsed = useMemo(() => parseQuery(activeWql), [activeWql])
  const sourceValue = sourceOfQuery(activeWql)

  // Enforce scope lock: only show scope radio if not locked to a specific source
  const shouldShowScopeRadio = !profile.hideScopeRadio && (!profile.scopeLock || profile.scopeLock === 'all')

  const handleScopeChange = useCallback(
    (scope: LibraryScope) => {
      setQuery(pivotSourceQuery(query, SOURCE_BY_SCOPE[scope]))
    },
    [query, setQuery],
  )

  const defaultAddToToday = useCallback(async (entry: Entry) => {
    const today = todayKey()
    let rawContent = ''
    if (entry.kind === 'session' || entry.kind === 'post') {
      const result = await queryService.runFind({
        raw: `find:block{note:${entry.id}}`,
        target: 'block',
        filters: [{ key: 'note', negate: false, values: [{ value: entry.id, wildcard: false }] }],
      } as ParsedFindQuery)
      rawContent = [...result.blocks]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .filter(b => b.rawContent.trim() !== '')
        .map(b => (b.dataType === 'frontmatter' ? `---\n${b.rawContent}\n---` : b.rawContent))
        .join('\n\n')
    } else if (entry.kind === 'note') {
      const note = await journalNotes.getById(entry.sourceItem)
      if (note && typeof note === 'object' && 'rawContent' in note && typeof note.rawContent === 'string') {
        rawContent = note.rawContent
      }
    }
    const input = addEntryToTodayInput(entry, rawContent, today)
    await journalNotes.create(input)
  }, [])

  const handleAddToToday = onAddToToday ?? defaultAddToToday

  const execute = useCallback<WqlExecutor>(
    ast => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  )

  // Query execution pipeline
  useEffect(() => {
    let cancelled = false
    const engine = queryEngine ?? defaultStreamQueryEngine

    setLoading(true)
    engine
      .query(activeWql)
      .then((results: Entry[]) => {
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
  }, [activeWql, queryEngine])

  // Partition entries into dated stream items and undated shelf/catalog items
  const dated = useMemo(
    () =>
      entries
        .filter(e => e.kind !== 'session' && e.date != null)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [entries],
  )
  const undated = useMemo(
    () => entries.filter(e => e.kind === 'session' || e.date == null),
    [entries],
  )

  // Progressive DOM batching
  const datedBatch = useBatchedItems(dated)
  const undatedBatch = useBatchedItems(undated)
  const byDate = useMemo(() => groupEntriesByDate(dated), [dated])
  const visibleByDate = useMemo(() => groupEntriesByDate(datedBatch.visible), [datedBatch.visible])
  const countByDate = useMemo(() => new Map(byDate.map(([k, group]) => [k, group.length])), [byDate])

  const today = todayKey()
  const stickyOffset = useStickyBoundaryOffset(104)

  // Subtitle resolution
  const renderedSubtitle = useMemo(() => {
    if (typeof profile.subtitle === 'function') {
      return profile.subtitle(query, sourceValue)
    }
    return profile.subtitle ?? ''
  }, [profile, query, sourceValue])

  // Query error detection (composed query is the default fallback and has nothing to flag unless edited or invalid from URL)
  const composedError = parsed.error && query !== profile.defaultWql ? parsed.error : null
  const queryError = urlQueryError ?? composedError

  // Empty state remedies
  const emptyStateRemedies = useMemo(() => {
    const remedies: { id: string; label: string; apply: () => void }[] = []
    if (!parsed.error && parsed.window) {
      const w = parsed.window
      const label = w.kind === 'relative' ? `last ${w.size}${w.unit}` : `from ${w.start}${w.end ? ` to ${w.end}` : ''}`
      remedies.push({
        id: 'remove-window',
        label: `Remove time window (${label})`,
        apply: () => setQuery(withoutWindow(query)),
      })
    }
    const activeFilters = parsed.error ? [] : parsed.filters.filter(f => f.key !== 'source')
    if (activeFilters.length > 0) {
      remedies.push({
        id: 'clear-filters',
        label: activeFilters.length === 1 ? 'Clear filter' : `Clear filters (${activeFilters.length})`,
        apply: () => setQuery(withoutFilters(query)),
      })
    }
    return remedies
  }, [parsed, query, setQuery])

  return (
    <div className="bg-card flex flex-col flex-1" data-testid="queriable-stream-view">
      {/* Sticky Header with Action Bar & Subheader */}
      <StickyPageHeader
        title={profile.title}
        subtitle={renderedSubtitle}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              title="View Settings"
              data-testid="stream-view-settings-trigger"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
        }
        subheader={
          <div className="px-6 py-2.5 flex flex-col gap-2">
            {shouldShowScopeRadio && (
              <SourceScopeRadio
                scope={SCOPE_BY_SOURCE[sourceValue] ?? 'all'}
                onChange={handleScopeChange}
              />
            )}
            <WqlComposer
              query={query}
              onQueryChange={setQuery}
              onLiveQueryChange={setLiveWql}
              execute={execute}
              hiddenClauseTypes={['source']}
            />
          </div>
        }
      />

      {/* Query error banner */}
      {queryError && (
        <div
          role="alert"
          className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
          data-testid="stream-query-error"
        >
          <TriangleAlertIcon className="size-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold">Query error</p>
            <p className="mt-1 font-mono text-[11px] opacity-90">{queryError}</p>
          </div>
        </div>
      )}

      {/* Main Content: Property Table vs Card Stream Layout */}
      {settings.layout === 'table' ? (
        <div className="flex-1">
          <PropertyTable
            entries={entries}
            level={profile.level}
            visibleFieldIds={settings.visibleFields}
            emptyMessage={profile.emptyMessage ?? 'No matching records found.'}
          />
        </div>
      ) : (
        <div className="flex-1 divide-y divide-border/60">
          {/* Undated Shelf (Sessions or Curated Workouts) */}
          {profile.shelfVisible && undated.length > 0 && (
            <div className="border-b border-border/60" data-testid="stream-shelf">
              <button
                type="button"
                onClick={() => setShelfOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-6 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {shelfOpen ? (
                    <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                  )}
                  <FolderIcon className="size-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-foreground">Catalog Sessions</span>
                  <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-full">
                    {undated.length}
                  </span>
                </div>
              </button>
              {shelfOpen && (
                <div className="divide-y divide-border/40">
                  {undatedBatch.visible.map(entry => (
                    <LibraryRow
                      key={entry.id}
                      entry={entry}
                      visibleFieldIds={settings.visibleFields}
                      onAddToToday={handleAddToToday}
                    />
                  ))}
                  <BatchingSentinel batch={undatedBatch} testId="stream-shelf-load-more" />
                </div>
              )}
            </div>
          )}

          {/* Dated Progressive Stream */}
          {dated.length > 0 ? (
            <div className="divide-y divide-border/40" data-testid="stream-dated-content">
              {visibleByDate.map(([dateKey, group]) => {
                const totalInDate = countByDate.get(dateKey) ?? group.length
                const isToday = dateKey === today
                return (
                  <div key={dateKey} className="group/date" data-testid={`date-group-${dateKey}`}>
                    <div
                      className="sticky z-10 px-6 py-2 bg-card/95 backdrop-blur border-y border-border/60 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      style={{ top: `${stickyOffset}px` }}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground">
                          {formatDateHeader(dateKey)}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {totalInDate} {totalInDate === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {group.map(entry => (
                        <LibraryRow
                          key={entry.id}
                          entry={entry}
                          visibleFieldIds={settings.visibleFields}
                          tone={isToday ? 'primary' : 'secondary'}
                          onAddToToday={handleAddToToday}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              <BatchingSentinel batch={datedBatch} />
            </div>
          ) : undated.length > 0 && !profile.shelfVisible ? (
            /* Undated stream (e.g. Efforts catalog) */
            <div className="divide-y divide-border/40" data-testid="stream-undated-content">
              {undatedBatch.visible.map(entry => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  visibleFieldIds={settings.visibleFields}
                  onAddToToday={handleAddToToday}
                />
              ))}
              <BatchingSentinel batch={undatedBatch} />
            </div>
          ) : loading && entries.length === 0 ? (
            /* Initial loading state */
            <div className="py-16 text-center text-xs text-muted-foreground/60" data-testid="stream-loading">
              Loading…
            </div>
          ) : entries.length === 0 && !loading ? (
            /* Empty State */
            <div
              className="px-6 py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3"
              data-testid="stream-empty-state"
            >
              <p className="text-sm font-medium">
                {profile.emptyMessage ?? 'No entries match your search.'}
              </p>
              {emptyStateRemedies.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  {emptyStateRemedies.map(r => (
                    <Button
                      key={r.id}
                      variant="outline"
                      size="sm"
                      onClick={r.apply}
                      className="text-xs"
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* View Settings Dialog */}
      <ViewSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        route={profile.route}
        level={profile.level}
        settings={settings}
        onLayoutChange={setLayout}
        onToggleField={toggleField}
        onReset={resetSettings}
      />
    </div>
  )
}
