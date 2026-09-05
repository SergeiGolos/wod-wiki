/**
 * QueriableStreamView — unified deep queriable stream across notes, efforts, and results (Ticket 003).
 *
 * Consolidates LibraryPage and EffortsCatalogPage into a single reusable view:
 * 1. Takes a StreamProfile (route, default WQL query, scope lock, level).
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
  Plus,
  SlidersHorizontal,
  TriangleAlertIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/primitives/button'
import { queryService } from '@/services/queryService'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@bitcobblers/wod-wiki-engine'
import type { WqlExecutor } from '@bitcobblers/wod-wiki-ui'
import { createPortal } from 'react-dom'
import {
  StickyPageHeader,
  useStickyBoundaryOffset,
  useMobileQuerySlot,
} from '@/panels/page-shells'
import { useIsMobile } from '../../hooks/useIsMobile'
import { StreamQueryBar } from './StreamQueryBar'
import type { Entry } from '../../lib/entryMapper'
import {
  groupEntriesByDimension,
  parseGroupingDimension,
} from '../../lib/entryGrouping'
import { defaultStreamQueryEngine, StreamQueryEngine } from '../../lib/entrySearch'
import { useNav } from '../../nav/NavContext'
import type { NavItemL3 } from '../../nav/navTypes'
import { ResponsiveActions } from '../../nav/ResponsiveActions'
import { useComposerQueryState } from '../../hooks/useComposerQueryState'
import { useViewSettings } from '../../lib/viewSettingsStorage'
import { useDateLocale } from '../../lib/dateLocale'
import { useBatchedItems, type BatchedItems } from '../../hooks/useBatchedItems'
import { todayKey } from '../../lib/dateFormat'
import { withoutFilters, withoutWindow } from '../../lib/wqlEdits'
import { LibraryRow } from '../library/LibraryRow'
import { PropertyTable } from './PropertyTable'
import { StreamFeed } from './StreamFeed'
import { ViewSettingsDialog } from './ViewSettingsDialog'
import { journalNotes } from '../../services/journalNotes'
import { ensurePlaygroundEntry } from '../../services/createPlaygroundPage'
import { addEntryToTodayInput } from '../../lib/addToToday'
import { startEntryRun } from '../../lib/entryRun'
import { playgroundPath } from '../../lib/routes'
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
  const navigate = useNavigate()
  // Synchronize composer state with URL
  const { query, setQuery, urlQueryError } = useComposerQueryState({
    defaultQuery: () => profile.defaultWql,
    legacy: profile.legacy,
  })

  // Per-route view settings (layout + field visibility)
  const { settings, setLayout, toggleField, setGroupBy, resetSettings } = useViewSettings(
    profile.route,
    profile.level,
  )

  useDateLocale()

  const [entries, setEntries] = useState<Entry[]>([])
  const [shelfOpen, setShelfOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // Mobile: the query bar portals into the app navbar (no page header).
  const isMobile = useIsMobile()
  const mobileSlot = useMobileQuerySlot()

  const parsed = useMemo(() => parseQuery(query), [query])

  // Playground scope: the canonical filter find:note{source:playground}. In
  // this scope the "Catalog Sessions" shelf would mislabel undated playground
  // entries — they render in the explicit 'Undated' group instead.
  const isPlaygroundScope = useMemo(() => {
    if (parsed.error) return false
    return parsed.filters.some(
      f => f.key === 'source' && !f.negate && f.values.some(v => v.value === 'playground'),
    )
  }, [parsed])

  // Feed mode attaches note block info (excerpt + wod content id) via the same
  // engine's block-plane companion query — never a second query-state seam.
  const activeEngine = useMemo<StreamQueryEngine>(() => {
    const base = queryEngine ?? defaultStreamQueryEngine
    return settings.layout === 'feed' ? base.withNoteBlockInfo() : base
  }, [queryEngine, settings.layout])

  const defaultAddToToday = useCallback(async (entry: Entry) => {
    const today = todayKey()
    let rawContent = ''
    const targetNoteId =
      entry.kind === 'result' || entry.kind === 'segment'
        ? entry.execution?.noteId
        : entry.kind === 'note'
          ? entry.sourceItem
          : entry.id

    if (targetNoteId) {
      // 1. If segment has a specific blockContentId, resolve that block first
      if (entry.kind === 'segment' && entry.blockContentId) {
        const result = await queryService.runFind({
          raw: `find:block{note:${targetNoteId}}`,
          target: 'block',
          filters: [{ key: 'note', negate: false, values: [{ value: targetNoteId, wildcard: false }] }],
        } as ParsedFindQuery)
        const matchingBlock = result.blocks.find(b => b.id === entry.blockContentId)
        if (matchingBlock?.rawContent) {
          rawContent = matchingBlock.rawContent
        }
      }

      // 2. If no block-specific content found, check if it's a journal note
      if (!rawContent && (entry.kind === 'note' || entry.kind === 'result' || entry.kind === 'segment')) {
        const note = await journalNotes.getById(targetNoteId)
        if (note && typeof note === 'object' && 'rawContent' in note && typeof note.rawContent === 'string') {
          rawContent = note.rawContent
        }
      }

      // 3. If still no content, fetch all blocks for the note (catalog sessions, feeds, or indexed notes)
      if (!rawContent && entry.kind !== 'note') {
        const result = await queryService.runFind({
          raw: `find:block{note:${targetNoteId}}`,
          target: 'block',
          filters: [{ key: 'note', negate: false, values: [{ value: targetNoteId, wildcard: false }] }],
        } as ParsedFindQuery)
        if (result.blocks.length > 0) {
          rawContent = [...result.blocks]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .filter(b => b.rawContent.trim() !== '')
            .map(b => (b.dataType === 'frontmatter' ? `---\n${b.rawContent}\n---` : b.rawContent))
            .join('\n\n')
        }
      }
    }

    const input = addEntryToTodayInput(entry, rawContent, today)
    await journalNotes.create(input)
  }, [])

  const handleAddToToday = onAddToToday ?? defaultAddToToday

  // Feed's Run action: stage a pending runtime (real UUID identity) before
  // navigating — never a bare /run/:contentId link. Failure stays visible.
  const handleRunEntry = useCallback(
    async (entry: Entry) => {
      setActionError(null)
      try {
        await startEntryRun(entry, navigate)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not start the workout.')
      }
    },
    [navigate],
  )

  // Feed's Playground action: persist the entry's content as a playground
  // entry (the intake helper persists BEFORE any navigation/runtime), then
  // open it. Failure stays visible — no silent fallback.
  const handleSendToPlayground = useCallback(
    async (entry: Entry) => {
      setActionError(null)
      try {
        const resolved = await journalNotes.resolve(entry.id)
        const content = resolved && typeof resolved === 'object' && 'rawContent' in resolved
          ? String(resolved.rawContent ?? '')
          : ''
        const { routeId } = await ensurePlaygroundEntry(content, { title: entry.title })
        navigate(playgroundPath(routeId.replace(/^playground\//, '')))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not create the playground entry.')
      }
    },
    [navigate],
  )

  const execute = useCallback<WqlExecutor>(
    ast => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  )

  // Query execution pipeline
  useEffect(() => {
    let cancelled = false
    const engine = activeEngine

    setLoading(true)
    engine
      .query(query)
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
  }, [query, activeEngine])

  // Grouping dimension: query `by {dim}` or view setting or default
  const groupDim = useMemo(() => {
    const fromQuery = parseGroupingDimension(query, parsed)
    if (fromQuery) return fromQuery
    if (settings.groupBy) return settings.groupBy
    if (profile.level === 'effort') return 'discipline'
    return 'date'
  }, [query, parsed, settings.groupBy, profile.level])

  // Full dataset grouped by dimension
  const shelfVisible = profile.shelfVisible && !isPlaygroundScope
  const allGroups = useMemo(
    () => groupEntriesByDimension(entries, groupDim, { shelfVisible }),
    [entries, groupDim, shelfVisible],
  )

  // Progressive DOM batching
  const entriesBatch = useBatchedItems(entries)
  const visibleGroups = useMemo(
    () => groupEntriesByDimension(entriesBatch.visible, groupDim, { shelfVisible }),
    [entriesBatch.visible, groupDim, shelfVisible],
  )
  const groupCountMap = useMemo(() => new Map(allGroups.map(g => [g.id, g.entries.length])), [allGroups])

  // Publish dynamic section links to NavContext
  const { setL3Items } = useNav()
  useEffect(() => {
    if (allGroups.length === 0) {
      setL3Items([])
      return
    }
    const sectionLinks: NavItemL3[] = allGroups.map(g => ({
      id: g.id,
      label: g.label,
      level: 3,
      action: { type: 'scroll', sectionId: g.id },
    }))
    setL3Items(sectionLinks)
    return () => setL3Items([])
  }, [allGroups, setL3Items])

  const handleGroupByChange = useCallback(
    (newGroup: string) => {
      setGroupBy(newGroup)
    },
    [setGroupBy],
  )
  const today = todayKey()
  const stickyOffset = useStickyBoundaryOffset(104)

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

  // Shared empty state for the grouped layouts (Cards / Feed) — same query,
  // same remedies, whichever mode is active.
  const streamEmptyState = (
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
  )

  return (
    <div className="bg-card flex flex-col flex-1" data-testid="queriable-stream-view">
      {/* Desktop: single-line header — the query bar fills the row left
          empty by the removed title.
          Mobile: no page-level header at all (it would stack over the app
          navbar and hide the menu trigger); the query bar portals up into
          that navbar instead. */}
      <div className="max-lg:hidden">
        <StickyPageHeader
          actions={
            <ResponsiveActions
              primary={
                <div className="flex items-center gap-1.5">
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
                  {profile.route === '/efforts' && (
                    <Button
                      size="sm"
                      onClick={() => navigate('/effort/new?mode=create')}
                      className="h-8 px-2.5 text-xs gap-1.5"
                      data-testid="efforts-catalog-create-btn"
                    >
                      <Plus className="size-3.5" />
                      <span>New</span>
                    </Button>
                  )}
                </div>
              }
              label="Stream actions"
            >
              {actions}
            </ResponsiveActions>
          }
          queryBar={
            <StreamQueryBar
              query={query}
              onQueryChange={setQuery}
              options={profile.typeOptions}
              execute={execute}
            />
          }
        />
      </div>
      {isMobile && mobileSlot && (
        createPortal(
          <StreamQueryBar
            query={query}
            onQueryChange={setQuery}
            options={profile.typeOptions}
            execute={execute}
            compact
          />,
          mobileSlot,
        )
      )}

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

      {/* Action error banner (e.g. playground intake persistence failure —
          no silent fallback) */}
      {actionError && (
        <div
          role="alert"
          className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive"
          data-testid="stream-action-error"
        >
          <TriangleAlertIcon className="size-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold">Action failed</p>
            <p className="mt-1 text-[11px] opacity-90">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] font-bold uppercase tracking-wider hover:opacity-80"
            data-testid="stream-action-error-dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content: Rows (table) / Feed (rich cards) / Cards (grouped stream) */}
      {settings.layout === 'rows' ? (
        <div className="flex-1">
          <PropertyTable
            entries={entries}
            level={profile.level}
            visibleFieldIds={settings.visibleFields}
            emptyMessage={profile.emptyMessage ?? 'No matching records found.'}
          />
        </div>
      ) : settings.layout === 'feed' ? (
        visibleGroups.length > 0 ? (
          <StreamFeed
            groups={visibleGroups}
            batch={entriesBatch}
            onRunEntry={handleRunEntry}
            onSendToPlayground={handleSendToPlayground}
          />
        ) : loading && entries.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground/60" data-testid="stream-loading">
            Loading…
          </div>
        ) : entries.length === 0 && !loading ? (
          streamEmptyState
        ) : null
      ) : (
        <div className="flex-1 divide-y divide-border/60">
          {/* Undated Shelf (Sessions or Curated Workouts) */}
          {/* Grouped Progressive Stream */}
          {visibleGroups.length > 0 ? (
            <div className="divide-y divide-border/40" data-testid="stream-dated-content">
              {visibleGroups.map(group => {
                const totalInGroup = groupCountMap.get(group.id) ?? group.entries.length

                // Undated Shelf (Sessions or Curated Workouts)
                if (group.key === 'shelf') {
                  return (
                    <div key={group.id} id={group.id} className="border-b border-border/60" data-testid="stream-shelf">
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
                          <span className="text-xs font-bold text-foreground">{group.label}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-full">
                            {totalInGroup}
                          </span>
                        </div>
                      </button>
                      {shelfOpen && (
                        <div className="divide-y divide-border/40">
                          {group.entries.map(entry => (
                            <LibraryRow
                              key={entry.id}
                              entry={entry}
                              visibleFieldIds={settings.visibleFields}
                              onAddToToday={handleAddToToday}
                              onRunStart={handleRunEntry}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={group.id} id={group.id} className="group/date" data-testid={`date-group-${group.key}`}>
                    <div
                      className="sticky z-10 px-6 py-2 bg-card/95 backdrop-blur border-y border-border/60 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                      style={{ top: `${stickyOffset}px` }}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground">
                          {group.label}
                        </span>
                        {group.isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {totalInGroup} {totalInGroup === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {group.entries.map(entry => (
                        <LibraryRow
                          key={entry.id}
                          entry={entry}
                          visibleFieldIds={settings.visibleFields}
                          tone={group.isToday ? 'primary' : 'secondary'}
                          onAddToToday={handleAddToToday}
                          onRunStart={handleRunEntry}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              <BatchingSentinel batch={entriesBatch} />
            </div>
          ) : loading && entries.length === 0 ? (
            /* Initial loading state */
            <div className="py-16 text-center text-xs text-muted-foreground/60" data-testid="stream-loading">
              Loading…
            </div>
          ) : entries.length === 0 && !loading ? (
            streamEmptyState
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
        activeGroupBy={groupDim}
        onGroupByChange={handleGroupByChange}
        onLayoutChange={setLayout}
        onToggleField={toggleField}
        onReset={resetSettings}
      />
    </div>
  )
}
