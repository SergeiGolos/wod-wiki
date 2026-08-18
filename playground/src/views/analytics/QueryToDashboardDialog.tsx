/**
 * QueryToDashboardDialog — the Explorer's two-stage dashboard flow.
 *
 * Stage 1 (data source): the subset query selected on the page — the find
 * query that picks WHICH workouts the statistics run over. Shown read-only.
 * Stage 2 (calculation): a metrics-plane composer seeded with the subset as
 * its `where` join, so the statistics are decoupled from the data source —
 * the calculation focuses on the subset, nothing else. The combined WQL
 * previews live.
 *
 * The Apply action is deliberately disabled: dashboard wiring (where the
 * combined query lands and how it's formatted) is a follow-up. The dialog
 * already does real work — the combined query it composes is the exact
 * payload that will be sent.
 *
 * Modal idiom matches the dashboard page's inspector modal (fixed overlay,
 * Escape/backdrop close) — the shared atoms Dialog is Radix-based and
 * misfires in the jsdom test env.
 */
import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/atoms/primitives/button'
import {
  WqlComposer,
  CLAUSE_META,
  defaultMetricsClauses,
  type QueryClause,
} from '@bitcobblers/wod-wiki-ui'

export interface QueryToDashboardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * The subset query from the page — the find WQL that selects the data
   * source. Null when the page query has no find half (whole-store
   * calculation); the calculation composer then seeds without a join.
   */
  subsetQuery: string | null
}

export function QueryToDashboardDialog({ open, onOpenChange, subsetQuery }: QueryToDashboardDialogProps) {
  const [combinedWql, setCombinedWql] = useState('')

  // Seed on open: metrics head + the subset as the where join. Keyed remount
  // per subset so the composer doesn't carry stale state across queries.
  const seedClauses = useMemo<QueryClause[]>(() => {
    const seed = defaultMetricsClauses()
    if (subsetQuery) {
      seed.push({ id: 'c-where', type: 'where', ...CLAUSE_META.where, value: subsetQuery })
    }
    return seed
  }, [subsetQuery])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      data-testid="query-to-dashboard-dialog"
      onClick={e => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Save query</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shape what gets saved, then choose where it lands. A subset query
              picks the workouts; the calculation runs over just that subset —
              ready to pin to a dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
            data-testid="close-dashboard-dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              1 · Subset — data source
            </div>
            {subsetQuery ? (
              <code
                className="block rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground"
                data-testid="dashboard-subset-query"
              >
                {subsetQuery}
              </code>
            ) : (
              <p className="text-xs text-muted-foreground" data-testid="dashboard-subset-query">
                No subset on the page query — the calculation runs over the whole store.
              </p>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              2 · Calculation — over the subset
            </div>
            <WqlComposer
              key={subsetQuery ?? '(whole-store)'}
              initialClauses={seedClauses}
              hiddenClauseTypes={['source']}
              onWqlChange={setCombinedWql}
            />
          </div>

          {combinedWql && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Combined query
              </div>
              <code
                className="block rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2 font-mono text-xs text-foreground break-all"
                data-testid="dashboard-combined-query"
              >
                {combinedWql}
              </code>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled title="Dashboard wiring lands in a follow-up" data-testid="dashboard-apply">
            Add to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
