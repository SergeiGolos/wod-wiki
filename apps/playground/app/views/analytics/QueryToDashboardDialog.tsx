/**
 * QueryToDashboardDialog — the Explorer's Save → "Add to dashboard" flow.
 *
 * Wraps the shared WidgetComposerDialog (dataset → calculation →
 * visualization → preview) and adds the destination step: pick an editable
 * vault dashboard, or create a new one. Apply persists the EXACT composed
 * WQL as a widget section (heading / question / ```query fence) appended to
 * the destination note — the locked #899 format, written through
 * journalNotes only.
 *
 * Persistence failures stay visible in the dialog (no silent fallback); a
 * successful save lands on the dashboard. The outer component gates on
 * `open` so every opening remounts a fresh flow — no stale drafts.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { parseQuery, serialize, isFindQuery } from '@bitcobblers/wod-wiki-engine'
import { appendWidget, type WidgetSpec } from '@/lib/dashboard/noteOps'
import { dashboardSlug, DEFAULT_DASHBOARD_TITLE } from '@/lib/dashboard/scaffold'
import { journalNotes } from '../../services/journalNotes'
import { dashboardNotes } from '../../services/dashboardNotes'
import { useDashboardCatalog } from '../../hooks/useDashboards'
import { dashboardViewPath } from '../../lib/routes'
import {
  WidgetComposerDialog,
  type WidgetComposerApply,
} from '../dashboards/WidgetComposerDialog'

export interface QueryToDashboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The subset query from the page — the find WQL that selects the data
   * source. Null when the page query has no find half (whole-store
   * calculation); the calculation composer then seeds without a join.
   */
  subsetQuery: string | null
  /** Board-matching preview context (same range/units the explorer ran). */
  rangeStart?: number
  rangeEnd?: number
  preferredUnit?: string
}

const NEW_DASHBOARD = '__new__'

export function QueryToDashboardDialog(props: QueryToDashboardDialogProps) {
  if (!props.open) return null
  return <SaveFlow key={props.subsetQuery ?? '(whole-store)'} {...props} />
}

function SaveFlow({
  onOpenChange,
  subsetQuery,
  rangeStart,
  rangeEnd,
  preferredUnit,
}: QueryToDashboardDialogProps) {
  const navigate = useNavigate()
  const { items, loading } = useDashboardCatalog()
  const editable = items.filter((d) => d.editable)
  const [destination, setDestination] = useState<string>(
    editable[0]?.slug ?? NEW_DASHBOARD,
  )
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const close = () => onOpenChange(false)

  const persist = async (spec: WidgetComposerApply) => {
    setError(null)
    const widget: WidgetSpec = {
      title: spec.title,
      question: spec.question,
      type: spec.type,
      spanCols: spec.spanCols,
      spanFull: spec.spanFull,
      wql: spec.wql,
      params: spec.params,
    }
    try {
      if (destination === NEW_DASHBOARD) {
        const title = newTitle.trim() || DEFAULT_DASHBOARD_TITLE
        const note = await dashboardNotes.createDashboard(title)
        await journalNotes.update(note.id, appendWidget(note.rawContent, widget))
        close()
        navigate(dashboardViewPath(dashboardSlug(title)))
      } else {
        // Fresh read at write time — the note may have changed since the
        // catalog listed it; appendWidget never targets stale content.
        const note = await journalNotes.resolve(destination)
        await journalNotes.update(note.id, appendWidget(note.rawContent, widget))
        close()
        navigate(dashboardViewPath(destination))
      }
    } catch (err) {
      // Storage failure stays on screen — the dialog stays open with the
      // draft intact; nothing is silently dropped or rerouted.
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <WidgetComposerDialog
      open
      onClose={close}
      mode="add"
      initialWql={seedQuery(subsetQuery)}
      subsetQuery={subsetQuery}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      preferredUnit={preferredUnit}
      onApply={persist}
      applyLabel="Add to dashboard"
      destination={
        <section>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Destination
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading dashboards…</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {editable.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    aria-pressed={destination === d.slug}
                    onClick={() => setDestination(d.slug)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      destination === d.slug
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {d.title}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="dashboard-dest-new"
                  aria-pressed={destination === NEW_DASHBOARD}
                  onClick={() => setDestination(NEW_DASHBOARD)}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    destination === NEW_DASHBOARD
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Plus className="size-3" /> New dashboard
                </button>
              </div>
              {destination === NEW_DASHBOARD && (
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={DEFAULT_DASHBOARD_TITLE}
                  data-testid="dashboard-new-title"
                  className="w-full sm:w-64 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              )}
            </div>
          )}
          {error && (
            <p role="alert" data-testid="dashboard-save-error" className="mt-2 text-xs text-destructive font-mono">
              Could not save: {error}
            </p>
          )}
        </section>
      }
    />
  )
}

/**
 * Seed the calculation composer: metrics head + the subset as its `where`
 * join — built structurally, emitted through the serializer, so the saved
 * widget's WQL is decoupled from the data source (the subset picks WHICH
 * workouts; the calculation runs over just that subset).
 */
function seedQuery(subsetQuery: string | null): string {
  if (!subsetQuery) return 'sum:{}'
  const subset = parseQuery(subsetQuery)
  if (!isFindQuery(subset) || subset.error) return 'sum:{}'
  return serialize({
    family: 'aggregate',
    raw: '',
    agg: 'sum',
    metric: '',
    filters: [],
    groupBy: [],
    join: {
      target: subset.target,
      filters: subset.filters,
      last: subset.window?.kind === 'relative'
        ? { size: subset.window.size, unit: subset.window.unit }
        : undefined,
    },
  })
}
