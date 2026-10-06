/**
 * TourSessionResult.tsx — the recorded-run review pane: the $session value
 * made visible. Header stats (elapsed, completion state, rounds/reps) plus
 * the recorded segment log — statement, time range, and the measures each
 * segment collected. Rendered in place of the editor after a run completes
 * (hero state machine) and in the Own-the-Metrics section once a session has
 * been recorded.
 */
import type { Sessions, StoredOutputStatement } from '@/components/Editor/types'

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type SegmentMetric = StoredOutputStatement['metrics'][number]

const fmtMetric = (m: SegmentMetric): string => {
  if (m.action === 'suppress') return ''
  const name = m.type ?? m.metricType ?? 'metric'
  const value = m.value === undefined || m.value === null ? '—' : String(m.value)
  return `${name}: ${value}${m.unit ? ` ${m.unit}` : ''}`
}

export interface TourSessionResultProps {
  result: Sessions
  /** Optional footer action (hero: back to the editor after reviewing). */
  onDismiss?: () => void
  dismissLabel?: string
}

export function TourSessionResult({ result, onDismiss, dismissLabel }: TourSessionResultProps) {
  const segments = (result.logs ?? []).filter((l) => l.outputType === 'segment')
  // Legacy/minimal payloads may omit the anchors — render relative offsets
  // only when the segment carries a span.
  const origin = result.startTime ?? 0
  return (
    <div className="flex h-full w-full flex-col overflow-auto p-4" data-testid="tour-session-result">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Session recorded
          </div>
          <div className="text-2xl font-extrabold tabular-nums tracking-tight">
            {fmtClock(result.duration)}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span
            className={
              result.completed
                ? 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400'
                : 'rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600 dark:text-amber-400'
            }
          >
            {result.completed ? 'Completed' : 'Stopped early'}
          </span>
          {result.roundsCompleted != null && (
            <span className="tabular-nums">
              Rounds {result.roundsCompleted}
              {result.totalRounds != null ? `/${result.totalRounds}` : ''}
            </span>
          )}
          {result.repsCompleted != null && (
            <span className="tabular-nums">Reps {result.repsCompleted}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {segments.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No segments were recorded.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border/50">
            {segments.map((seg, i) => {
              const label =
                (seg.text ?? '').trim() ||
                (seg.line != null ? `Line ${seg.line}` : `Segment ${i + 1}`)
              // Serialised logs from older records may omit the array.
              const chips = (seg.metrics ?? []).map(fmtMetric).filter(Boolean)
              return (
                <li key={seg.id ?? i} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium">{label}</span>
                    {chips.length > 0 && (
                      <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                        {chips.join(' · ')}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {seg.timeSpan
                      ? `${fmtClock(seg.timeSpan.started - origin)} → ${fmtClock(seg.timeSpan.ended - origin)}`
                      : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {onDismiss && (
        <div className="flex justify-end border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent"
            data-testid="tour-session-result-dismiss"
          >
            {dismissLabel ?? 'Back'}
          </button>
        </div>
      )}
    </div>
  )
}

export default TourSessionResult
