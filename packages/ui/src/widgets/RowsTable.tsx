import { useMemo, type ReactNode } from 'react';
import type { Segment } from '@wod-wiki/core';
import type { RowsQueryResult, RowsRun } from '@wod-wiki/wql';
import { getAnalyticsFromLogs } from '@wod-wiki/lang';

export interface RowsTableProps {
  result: RowsQueryResult;
  /** Optional per-run chrome rendered inside the section header (#948 RPE). */
  renderRunHeaderExtra?: (run: RowsRun) => ReactNode;
  /** Optional segment grid renderer (e.g. app's ReviewGrid). Default: clean plain table rows. */
  renderSegments?: (segments: Segment[], run: RowsRun) => ReactNode;
}

function formatRunHeader(run: RowsRun): string {
  const end = run.result.data.endTime ?? run.result.createdAt;
  const date = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const durationMs = run.result.data.duration;
  if (!durationMs) return date;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${date} — ${minutes}:${seconds}`;
}

function PlainSegmentList({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2 px-3">
        No segmented output recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-border/40 rounded-b-md">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground text-left">
            <th className="py-1.5 px-3 font-medium">Segment</th>
            <th className="py-1.5 px-3 font-medium text-right">Time</th>
            <th className="py-1.5 px-3 font-medium text-right">Metrics</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => {
            const metricSummary = Object.entries(seg.metric ?? {})
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            return (
              <tr key={seg.id} className="border-b border-border/20 hover:bg-muted/30">
                <td className="py-1.5 px-3 font-medium text-foreground">{seg.name || 'Segment'}</td>
                <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                  {seg.elapsed ? `${Math.round(seg.elapsed)}s` : '—'}
                </td>
                <td className="py-1.5 px-3 text-right text-muted-foreground">{metricSummary || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RowsTable({
  result,
  renderRunHeaderExtra,
  renderSegments,
}: RowsTableProps) {
  const runs = useMemo(
    () =>
      result.runs.map((run) => ({
        run,
        segments: getAnalyticsFromLogs(run.logs, run.result.data.startTime).segments as Segment[],
      })),
    [result],
  );

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground px-4 py-6 text-center">
        No workout logs matched this rows query.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {runs.map(({ run, segments }) => (
        <section key={run.result.id}>
          {runs.length > 1 && (
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground px-2 py-1.5 bg-muted/40 rounded-t-md border-b border-border/60">
              <span>{formatRunHeader(run)}</span>
              {renderRunHeaderExtra?.(run)}
            </div>
          )}
          {renderSegments ? (
            renderSegments(segments, run)
          ) : (
            <PlainSegmentList segments={segments} />
          )}
        </section>
      ))}
    </div>
  );
}
