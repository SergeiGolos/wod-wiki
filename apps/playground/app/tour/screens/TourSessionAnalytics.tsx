/**
 * TourSessionAnalytics.tsx — the explore-section stage pane: the session
 * adapter between the homepage tour and the production WQL/dashboard stack.
 *
 * Four panes driven by the wql-* stages:
 *  - wql-idea: the WQL vocabulary strip (shared with the showcase tiles).
 *  - wql-table: a REAL WqlTable running the caption-selected query. When a
 *    playground run exists the query is scoped to that run's note with a
 *    `note:<id>` filter — the table answers "what did I just log". Without a
 *    run the query runs unscoped against the live store; an empty store
 *    offers the independent sample dataset (separate sample notes — never
 *    touching a run note). A floating Revert appears whenever the query
 *    diverges from the stage default.
 *  - wql-graphs: the showcase graph tiles (live store queries, per-widget
 *    sample fallback).
 *  - wql-dashboard: a REAL seeded board (markdown/dashboards/**) rendered by
 *    the production DashboardView with the same range/unit/inspect wiring as
 *    /dashboard/:slug. Caption buttons switch boards.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { queryService } from '@/services/queryService'
import { type AnyParsedQuery, type QueryResult } from '@bitcobblers/wod-wiki-engine'
import { RangeSelector, AnalyticsUnitPreference, DashboardView, WqlTable, useAnalyticsUnitPreference } from '@bitcobblers/wod-wiki-ui'
import { parseDashboardNote, buildDashboardDocument, defaultTokenValues, type DashboardWidget as ModelWidget } from '@bitcobblers/wod-wiki-wql'
import { useAnalyticsRange } from '../../hooks/useAnalyticsRange'
import { buildDashboardSeeds } from '../../lib/dashboardSeeds'
import { useSeedContent } from '@/services/content/seedContent'
import { WidgetComposerDialog } from '../../views/dashboards/WidgetComposerDialog'
import { SampleDataPrompt } from '../../views/analytics/SampleDataPrompt'
import { loadSampleData } from '@/services/analytics/sample'
import { StreamQueryBar } from '../../views/stream/StreamQueryBar'
import { VocabularyStrip } from '../HomeAnalyticsSection'

/** Caption command key → base (unscoped) WQL query + display unit. */
export const TABLE_QUERIES: Record<string, { query: string; unit: string }> = {
  'q-elapsed': { query: 'sum:elapsed{} by {effort}', unit: 's' },
  'q-reps': { query: 'sum:totalReps{} by {effort}', unit: 'reps' },
  'q-tonnage': { query: 'sum:totalVolume{} by {week}', unit: 'kg' },
  'q-tis': { query: 'avg:tis{}', unit: 'pts' },
}
export const DEFAULT_TABLE_QUERY_KEY = 'q-elapsed'

/** Boards addressable from the wql-dashboard caption buttons. */
export const BOARD_SLUGS = ['training-block-review', 'road-to-560-total', 'polarized-base-marathon'] as const
export const DEFAULT_BOARD_SLUG = 'training-block-review'

/**
 * Scope a code-owned base query to one playground note (`note:<id>` filter).
 * AST-safe: merges into the existing filter braces without a trailing comma
 * (`{}` → `{note:<id>}`; `{discipline:strength}` → `{note:<id>, discipline:strength}`).
 */
export function scopeQueryToNote(query: string, noteId: string): string {
  const open = query.indexOf('{')
  if (open === -1) return `${query}{note:${noteId}}`
  const close = query.indexOf('}', open)
  const inner = query.slice(open + 1, close).trim()
  const merged = inner ? `note:${noteId}, ${inner}` : `note:${noteId}`
  return `${query.slice(0, open)}{${merged}}${query.slice(close + 1)}`
}

export interface TourSessionAnalyticsProps {
  /** Active stage id (or the section's fixed pane id). */
  activeStageId: string
  /** Current playground run's note id — null before the first run. */
  noteId: string | null
  /** Caption-selected table query key (TABLE_QUERIES keys). */
  queryKey: string
  /** Caption-selected board slug (BOARD_SLUGS entries). */
  boardSlug: string
}

export function TourSessionAnalytics({
  activeStageId,
  noteId,
  queryKey,
  boardSlug,
}: TourSessionAnalyticsProps) {
  switch (activeStageId) {
    case 'wql-table':
      return <SessionTablePane noteId={noteId} queryKey={queryKey} />
    case 'wql-dashboard':
      return <DashboardPane boardSlug={boardSlug} />
    default:
      return <VocabularyPane />
  }
}

// ── wql-idea ────────────────────────────────────────────────────────────────

function VocabularyPane() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-6" data-testid="tour-session-vocab">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Own the analytics
          </span>
          <p className="text-sm text-muted-foreground">
            aggregator · metric · filter · dimension · rollup — the whole
            language fits on one strip.
          </p>
        </div>
        <VocabularyStrip />
      </div>
    </div>
  )
}

// ── wql-table: the session-scoped real table ───────────────────────────────

/**
 * The table answers from ONE of two independent sources:
 *  - 'session': the current playground run's note (`note:<id>` filter; the
 *    unscoped journal before the first run).
 *  - 'sample': the independent sample dataset (its own sample notes — a run
 *    note is never touched), available even alongside a current run.
 * The query is EDITABLE (real WQL composer); the floating Revert returns to
 * the saved run's default query — not merely the previous preset.
 */
function SessionTablePane({ noteId, queryKey }: { noteId: string | null; queryKey: string }) {
  const def = TABLE_QUERIES[queryKey] ?? TABLE_QUERIES[DEFAULT_TABLE_QUERY_KEY]!
  const [source, setSource] = useState<'session' | 'sample'>('session')
  const [editedQuery, setEditedQuery] = useState<string | null>(null)
  const [sampleLoaded, setSampleLoaded] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const presetQuery = noteId ? scopeQueryToNote(def.query, noteId) : def.query
  const activeQuery = source === 'sample' ? (editedQuery ?? def.query) : (editedQuery ?? presetQuery)

  // WqlExecutor consumes the parsed AST (same seam as the dashboard composer).
  const runQueryExecutor = useCallback(
    (ast: AnyParsedQuery) => queryService.runQuery(ast.raw),
    [],
  )
  const runQuery = useCallback(async (q: string) => {
    try {
      const r = await queryService.runQuery(q)
      setResult(r)
    } catch {
      setResult(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await runQuery(activeQuery)
    })()
    return () => {
      cancelled = true
    }
  }, [activeQuery, refreshKey, runQuery])

  const hasPoints = !!result && result.series.some((s) => s.points.length > 0)
  const canRevert = source === 'sample' || editedQuery !== null
  const revert = () => {
    setSource('session')
    setEditedQuery(null)
  }
  const loadSample = async () => {
    setSampleLoading(true)
    try {
      await loadSampleData()
      setSampleLoaded(true)
      setSource('sample')
      setRefreshKey((k) => k + 1)
    } finally {
      setSampleLoading(false)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col p-5" data-testid="tour-session-table">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {source === 'sample' ? 'Sample data' : noteId ? 'This run' : 'Your journal'}
          </div>
          <div className="mt-1">
            <StreamQueryBar
              query={activeQuery}
              onQueryChange={(q) => setEditedQuery(q)}
              scopeOptions={[]}
              execute={runQueryExecutor}
              defaultQuery={presetQuery}
            />
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          {canRevert && (
            <button
              type="button"
              onClick={revert}
              data-testid="tour-session-revert"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Revert to current session
            </button>
          )}
          <button
            type="button"
            onClick={loadSample}
            disabled={sampleLoading}
            data-testid="tour-session-sample"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
          >
            {sampleLoading ? 'Loading…' : sampleLoaded ? 'Resample' : 'Load sample data'}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto pt-3">
        {source === 'session' && result && !hasPoints && noteId ? (
          <p className="max-w-sm text-center text-sm text-muted-foreground" data-testid="tour-session-table-empty">
            This run has no logged metrics for that query yet — step through the
            clock (Next) or press Stop to log what you completed.
          </p>
        ) : result && hasPoints ? (
          <div className="max-h-full w-full max-w-3xl">
            <WqlTable result={result} unit={def.unit} />
          </div>
        ) : (
          <SampleDataPrompt
            layout="card"
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </div>
    </div>
  )
}

// ── wql-dashboard: real seeded boards ──────────────────────────────────────

function DashboardPane({ boardSlug }: { boardSlug: string }) {
  const files = useSeedContent()
  const seeds = useMemo(() => (files ? buildDashboardSeeds(files) : []), [files])
  const seed = useMemo(
    () => seeds.find((s) => s.slug === boardSlug) ?? seeds[0],
    [seeds, boardSlug],
  )
  const document = useMemo(() => {
    if (!seed?.rawContent) return null
    try {
      const { meta, sections } = parseDashboardNote(seed.rawContent)
      return buildDashboardDocument(sections, meta)
    } catch {
      return null
    }
  }, [seed])

  const [weeks] = useAnalyticsRange()
  const { unit } = useAnalyticsUnitPreference()
  const rangeStart = Date.now() - weeks * 7 * 86400000
  const rangeEnd = Date.now()

  const [inspect, setInspect] = useState<ModelWidget | null>(null)

  return (
    <div className="flex h-full w-full flex-col" data-testid="tour-session-dashboard">
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-primary">
          {seed?.title ?? boardSlug}
        </div>
        <div className="flex items-center gap-2">
          <RangeSelector />
          <AnalyticsUnitPreference />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 pb-5 pt-3">
        {document ? (
          <DashboardView
            document={document}
            executor={queryService}
            onInspectWidget={setInspect}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            preferredUnit={unit}
          />
        ) : (
          <p className="pt-8 text-center text-sm text-muted-foreground">Loading board…</p>
        )}
      </div>

      <WidgetComposerDialog
        open={inspect !== null}
        onClose={() => setInspect(null)}
        mode="inspect"
        initialWql={inspect?.body ?? 'sum:totalVolume{}'}
        initial={
          inspect
            ? {
                title: inspect.title,
                question: inspect.question,
                type: inspect.type,
                spanCols: inspect.spanCols,
                spanFull: inspect.spanFull,
                attributes: inspect.attributes,
              }
            : undefined
        }
        executor={queryService}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        preferredUnit={unit}
        tokenValues={document ? defaultTokenValues(document.tokens) : undefined}
        onApply={undefined}
      />
    </div>
  )
}

export default TourSessionAnalytics
