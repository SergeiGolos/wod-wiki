/**
 * RowsTable — the plain renderer for a rows query result (rows:{…}, #949).
 *
 * One section per run (newest first), each rendering that run's pivoted
 * per-statement grid through the CDL ReviewGrid machinery — the same columns
 * the retired fullscreen review used, now served from a WQL query. Section
 * headers only appear when more than one run is present (block:/note: scopes).
 *
 * No widen toggle, no RPE chrome here — that's the results-flavored layer
 * (#948) built on top of this plain grid; hosts inject per-run header chrome
 * through `renderRunHeaderExtra`.
 */
import { useMemo, type ReactNode } from 'react';
import type { RowsQueryResult, RowsRun } from '@/services/analytics/query';
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import { ReviewGrid } from '@/components/organisms/review/ReviewGrid';
import type { Segment } from '@/core/models/AnalyticsModels';

const NO_SELECTION = new Set<number>();
const NOOP_SELECT = () => undefined;

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

export interface RowsTableProps {
  result: RowsQueryResult;
  /** Optional per-run chrome rendered inside the section header (#948 RPE). */
  renderRunHeaderExtra?: (run: RowsRun) => ReactNode;
  /** Optional segment-grid renderer prop (decoupled from app ReviewGrid). */
  renderSegments?: (segments: Segment[], run: RowsRun) => ReactNode;
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
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground px-1 py-1 bg-muted/40 rounded-t-md border-b border-border/60">
              <span>{formatRunHeader(run)}</span>
              {renderRunHeaderExtra?.(run)}
            </div>
          )}
          {renderSegments ? (
            renderSegments(segments, run)
          ) : (
            <ReviewGrid
              runtime={null}
              segments={segments}
              selectedSegmentIds={NO_SELECTION}
              onSelectSegment={NOOP_SELECT}
              groups={[]}
            />
          )}
        </section>
      ))}
    </div>
  );
}
