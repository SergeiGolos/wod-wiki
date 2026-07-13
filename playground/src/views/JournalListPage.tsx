/**
 * JournalListPage — the unified journal view.
 *
 * One page replaces the prior /journal (history-only) and /plan (future-only)
 * routes. The visible date window is driven by `?mode=`:
 *
 *   history  — past entries + today (default for users with backfilled data)
 *   today    — just today
 *   plan     — today + the forward planning window (today+14, +7 for any future
 *              entry beyond that, capped at today+90)
 *   all      — history + today + plan in a single feed (default)
 *
 * `?s=<date>` continues to drive the focused-date filter; `?sel=` seeds the
 * multi-select state from a ctrl-click off an entry page. Behaviour preserved
 * from the prior pages:
 *
 *   - results + journalEntries load once on mount
 *   - past dates capped at today via `key <= todayKey` (history semantics)
 *   - future dates extend via `addDays(horizon, …)` (plan semantics)
 *   - the visible `items` list is empty in plan mode (no past-results overlay)
 *   - create-note cards appear on every visible date that has no entry
 *   - showEmptyDates is always true (a calendar grid is what users expect)
 *
 * See docs/adr/unified-journal-with-plan-mode.md for the decision rationale.
 */

import { useMemo, useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { WorkoutItem } from '../lib/workoutIndex'
import { useJournalQueryState, type JournalViewMode } from '../hooks/useJournalQueryState'
import { useShowPlaygrounds } from '../hooks/useShowPlaygrounds'
import { useCreateJournalEntry } from '../hooks/useCreateJournalEntry'
import { indexedDBService } from '@/services/db/IndexedDBService'
import { playgroundContent } from '../services/playgroundContent'
import { localDateKey, type JournalEntrySummary } from './queriable-list/JournalDateScroll'
import type { FilteredListItem } from './queriable-list/types'
import { JournalFeed } from './JournalFeed'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

interface JournalListPageProps {
  onSelect: (item: SelectWorkoutItemLike) => void
  onCreateEntry?: (date: Date) => void
  /** Workout library items forwarded from App — used by the Collection source in the create palette. */
  workoutItems?: WorkoutItem[]
}

/** Reduced shape of the `SelectWorkoutItem` for adapter injection. */
interface SelectWorkoutItemLike {
  name: string
  category?: string
  content?: string
}

/**
 * Compute the ordered list of date keys (YYYY-MM-DD) to display given the
 * current mode, focus, multi-select, and the loaded journal entries.
 *
 *   history  — focused date (single) | today + every past entry date
 *   today    — focused date (single) | today only
 *   plan     — focused date (single) | today..horizon (where horizon = today+14,
 *              extended +7 beyond any future entry date, capped at today+90)
 *   all      — focused date (single) | union of history and plan windows
 */
function computeDateKeys(
  mode: JournalViewMode,
  focusedDate: string | null,
  multiCount: number,
  journalEntries: Map<string, JournalEntrySummary>,
  listItems: readonly FilteredListItem[],
  todayKey: string,
  now: Date,
): string[] {
  if (focusedDate && multiCount === 0) return [focusedDate]

  const past = new Set<string>()
  past.add(todayKey)
  journalEntries.forEach((_, key) => {
    if (key <= todayKey) past.add(key)
  })
  listItems.forEach(item => {
    if (item.date) {
      const key = localDateKey(new Date(item.date))
      if (key <= todayKey) past.add(key)
    }
  })

  if (mode === 'today') return [todayKey]
  if (mode === 'history') return Array.from(past).sort().reverse()

  // plan or all — also include a forward window
  const cap = addDays(now, 90)
  let horizon = addDays(now, 14)
  journalEntries.forEach((_, key) => {
    if (key >= todayKey) {
      const entryDate = new Date(key + 'T00:00:00')
      const withBuffer = addDays(entryDate, 7)
      if (withBuffer > horizon) horizon = withBuffer
    }
  })
  const endDate = horizon > cap ? cap : horizon

  const future: string[] = []
  let d = new Date(now)
  while (localDateKey(d) <= localDateKey(endDate)) {
    future.push(localDateKey(d))
    d = addDays(d, 1)
  }

  if (mode === 'plan') return future // today first, ascending future

  // all — history past first (newest → oldest), then today + future ascending
  const todayAndFutureAsc = future
  const pastSortedDesc = Array.from(past)
    .filter(key => !todayAndFutureAsc.includes(key))
    .sort()
    .reverse()
  return [...pastSortedDesc, ...todayAndFutureAsc]
}

export function JournalListPage({
  onSelect,
  onCreateEntry,
  workoutItems = [],
}: JournalListPageProps) {
  const { dateParam, setDateParam, mode } = useJournalQueryState()
  const navigate = useNavigate()

  const focusedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set())

  const toggleMultiSelect = useCallback((key: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Consume ?sel= — set by JournalNavPanel when ctrl+clicking from an entry page.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const sel = searchParams.get('sel')
    if (!sel) return
    const keys = sel.split(',').filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
    if (keys.length > 0) setMultiSelected(new Set(keys))
    setSearchParams(prev => {
      prev.delete('sel')
      return prev
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Data loading ──────────────────────────────────────────────────────────
  const [results, setResults] = useState<unknown[]>([])
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const [rawResults, lowerPages, upperPages] = await Promise.all([
          indexedDBService.getRecentResults(100),
          playgroundContent.getPagesByCategory('journal'),
          playgroundContent.getPagesByCategory('Journal'),
        ])
        if (cancelled) return

        const entryMap = new Map<string, JournalEntrySummary>()
        ;[...lowerPages, ...upperPages].forEach(page => {
          const dateKey = page.id.replace(/^journal\//, '')
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            const headingMatch = page.content.match(/^#\s+(.+)$/m)
            entryMap.set(dateKey, {
              title: headingMatch ? headingMatch[1].trim() : dateKey,
              updatedAt: page.updatedAt,
            })
          }
        })

        setResults(rawResults)
        setJournalEntries(entryMap)
      } catch {
        setResults([])
        setJournalEntries(new Map())
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Show playgrounds toggle ───────────────────────────────────────────────
  const [showPlaygrounds] = useShowPlaygrounds()

  // ── Map results → list items ──────────────────────────────────────────────
  const listItems = useMemo<FilteredListItem[]>(() => {
    const allItems = (results as Array<{ id: string; noteId?: string; completedAt: number; data?: { completed?: boolean } }>).map(r => {
      const safeNoteId = r.noteId || ''
      const isPlayground = safeNoteId.startsWith('playground/') || UUID_RE.test(safeNoteId)
      const parts = safeNoteId.split('/')
      const lastSegment = parts[parts.length - 1] || safeNoteId
      const isDateSegment = /^\d{4}-\d{2}-\d{2}$/.test(lastSegment)
      const title = isPlayground
        ? 'Playground'
        : isDateSegment
          ? (parts[parts.length - 2] || lastSegment)
          : lastSegment
      return {
        id: r.id,
        type: 'result' as const,
        title,
        subtitle: r.data?.completed ? 'Completed' : 'Partial',
        date: r.completedAt,
        group: isPlayground ? 'playground' : undefined,
        payload: r,
      }
    })
    if (!showPlaygrounds) {
      return allItems.filter(item => item.group !== 'playground')
    }
    return allItems
  }, [results, showPlaygrounds])

  // ── Date keys to display ──────────────────────────────────────────────────
  const todayKey = useMemo(() => localDateKey(new Date()), [])
  const now = useMemo(() => new Date(), [])

  const dateKeys = useMemo(
    () =>
      computeDateKeys(
        mode,
        focusedDate,
        multiSelected.size,
        journalEntries,
        listItems,
        todayKey,
        now,
      ),
    [mode, focusedDate, multiSelected.size, journalEntries, listItems, todayKey, now],
  )

  // Items shown: in plan mode there is no past-results overlay; only past
  // results fit on the past side of the window. We hide items entirely when
  // the visible window is future-only.
  const visibleItems = mode === 'plan' ? [] : listItems

  // ── Create-note cards ─────────────────────────────────────────────────────
  const createNoteDates = useMemo<Set<string>>(() => {
    if (focusedDate && multiSelected.size === 0) {
      return journalEntries.has(focusedDate) ? new Set() : new Set([focusedDate])
    }
    const set = new Set<string>()
    dateKeys.forEach(key => {
      if (!journalEntries.has(key)) set.add(key)
    })
    return set
  }, [focusedDate, multiSelected.size, journalEntries, dateKeys])

  // Dates that get a selection highlight ring
  const selectedDateKeys = useMemo<Set<string> | undefined>(() => {
    const combined = new Set<string>([
      ...(focusedDate ? [focusedDate] : []),
      ...multiSelected,
    ])
    return combined.size > 0 ? combined : undefined
  }, [focusedDate, multiSelected])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateHeaderClick = useCallback(
    (key: string, isMultiSelect: boolean) => {
      if (isMultiSelect) {
        toggleMultiSelect(key)
      } else {
        setMultiSelected(new Set())
        setDateParam(key)
      }
    },
    [toggleMultiSelect, setDateParam],
  )

  const handleCreateNote = useCreateJournalEntry({ workoutItems })

  const handleSelect = useCallback(
    (item: FilteredListItem) => {
      if (item.type === 'result') {
        navigate(`/review/${item.id}`)
      } else {
        onSelect(item.payload as SelectWorkoutItemLike)
      }
    },
    [navigate, onSelect],
  )

  const handleOpenEntry = useCallback(
    (key: string) => {
      navigate(`/journal/${key}`)
    },
    [navigate],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <JournalFeed
      dateKeys={dateKeys}
      items={visibleItems}
      journalEntries={journalEntries}
      onSelect={handleSelect}
      onOpenEntry={handleOpenEntry}
      onCreateEntry={onCreateEntry}
      onCreateNote={handleCreateNote}
      createNoteDates={createNoteDates}
      selectedDateKeys={selectedDateKeys}
      onDateHeaderClick={handleDateHeaderClick}
      showEmptyDates
    />
  )
}
