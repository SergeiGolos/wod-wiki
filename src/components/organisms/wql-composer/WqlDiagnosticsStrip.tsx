/**
 * WqlDiagnosticsStrip — the composer's live feedback row (issue #832,
 * decision #826).
 *
 * Renders, left to right:
 *   1. Validity badge — green "valid" or red with the parser's error message;
 *      when the error is attributed to a slot, the slot's label is named.
 *   2. AST summary — target, scope, time window, and metric join for valid
 *      find queries.
 *   3. Stage counts — `N of M <target>s matched` from the debounced runFind
 *      execution, shown for valid queries with an executor wired.
 *
 * Presentational only; all computation lives in ./diagnostics and
 * ./useWqlStageCounts.
 */

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFindQuery } from '@/services/analytics/query/wql'
import { summarizeFind, type WqlDiagnostics } from './diagnostics'
import type { WqlStageCounts } from './useWqlStageCounts'

export interface WqlDiagnosticsStripProps {
  diagnostics: WqlDiagnostics
  /** Label of the offending slot (e.g. "Metric Join"), when identified. */
  offendingLabel?: string
  /** Live execution counts; undefined until the debounced run resolves. */
  stages?: WqlStageCounts
  className?: string
}

function SummaryChip({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <span data-testid={testId} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="uppercase tracking-wider text-[9px] font-bold text-muted-foreground/60">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}

export function WqlDiagnosticsStrip({
  diagnostics,
  offendingLabel,
  stages,
  className,
}: WqlDiagnosticsStripProps) {
  const { valid, error, ast } = diagnostics
  const summary = valid && isFindQuery(ast) ? summarizeFind(ast) : undefined

  return (
    <div
      data-testid="wql-diagnostics"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 px-1.5 text-[11px] font-mono text-muted-foreground',
        className,
      )}
    >
      <span
        data-testid="wql-validity-badge"
        data-valid={valid}
        title={valid ? undefined : error}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider max-w-full',
          valid
            ? 'border-green-500/40 bg-green-500/10 text-green-600'
            : 'border-red-500/40 bg-red-500/10 text-red-600',
        )}
      >
        {valid ? <CheckCircle2 className="size-3 shrink-0" /> : <AlertCircle className="size-3 shrink-0" />}
        {valid ? 'valid' : (
          <span className="truncate normal-case font-mono font-semibold max-w-[420px]">{error}</span>
        )}
      </span>

      {!valid && offendingLabel && (
        <span className="text-red-600/90">
          {'check the '}
          <span className="font-bold">{offendingLabel}</span>
          {' slot'}
        </span>
      )}

      {summary && (
        <span data-testid="wql-ast-summary" className="inline-flex items-center gap-x-3 gap-y-1 flex-wrap">
          <SummaryChip label="target" value={summary.target} testId="wql-summary-target" />
          <SummaryChip label="scope" value={summary.scope} testId="wql-summary-scope" />
          {summary.window && <SummaryChip label="window" value={summary.window} testId="wql-summary-window" />}
          {summary.join && <SummaryChip label="join" value={summary.join} testId="wql-summary-join" />}
        </span>
      )}

      {summary && stages && (
        <span data-testid="wql-stage-counts" className="text-muted-foreground">
          {stages.matched} of {stages.selected} {summary.target}s matched
        </span>
      )}
    </div>
  )
}
