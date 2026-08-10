/**
 * RowsResultsChrome — the results-flavored layer over the plain rows grid
 * (#948, locked design from the #943 prototype, variant A "chrome header").
 *
 * A ```query:table block carrying `rows:{result:<id>}` (the shape written on
 * workout completion, #944) renders with:
 *
 *   1. Widen toggle — segmented `This session | All versions` control. Ephemeral
 *      view state only: the note's query text is never modified; remounting
 *      returns to the session view. "All versions" runs `rows:{block:<contentId>}`
 *      and is disabled (with an explanatory tooltip) when the block has no
 *      other versions.
 *   2. Inline RPE capture — a header chip showing the stored RPE or expanding
 *      the 1–10 scale in place; writes through captureSessionRpe + rederive.
 *      In the widened view the current run stays editable in its section
 *      header; past runs show read-only values.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parseQuery,
  isRowsQuery,
  queryService,
  type RowsQueryResult,
  type RowsRun,
} from '@/services/analytics/query';
import { captureSessionRpe, readSessionRpe } from '@/services/analytics/captureSessionRpe';
import { RowsTable } from '@/components/molecules/analytics/RowsTable';
import { cn } from '@/lib/utils';

const RPE_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export interface RowsResultsChromeProps {
  /** The session result id from the written `rows:{result:…}` query. */
  resultId: string;
  /** The session-scoped rows result (one run). */
  sessionResult: RowsQueryResult;
  /** Re-run the parent query after a capture so the grid reflects the RPE. */
  onCaptured: () => void;
}

/** Chip + in-place 1–10 scale for one run's session RPE. */
function RpeChip({
  resultId,
  logs,
  readOnly,
  onCapture,
}: {
  resultId: string;
  logs: RowsRun['logs'];
  readOnly?: boolean;
  onCapture: (rpe: number) => Promise<void>;
}) {
  const value = readSessionRpe(logs);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (readOnly) {
    return value !== undefined ? (
      <span className="text-[10px] font-mono text-muted-foreground" data-testid={`rpe-readonly-${resultId}`}>
        RPE {value}
      </span>
    ) : null;
  }

  const pick = async (rpe: number) => {
    setPending(true);
    try {
      await onCapture(rpe);
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1" data-testid={`rpe-chip-${resultId}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors',
          value !== undefined
            ? 'border-border text-foreground hover:border-primary'
            : 'border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-primary',
        )}
        title={value !== undefined ? 'Update session RPE' : 'Rate this session’s effort'}
      >
        {value !== undefined ? `RPE ${value}` : 'RPE —'}
      </button>
      {open && (
        <span className="inline-flex gap-0.5" data-testid={`rpe-scale-${resultId}`}>
          {RPE_SCALE.map((rpe) => (
            <button
              key={rpe}
              type="button"
              disabled={pending}
              onClick={() => void pick(rpe)}
              aria-label={`RPE ${rpe}`}
              className={cn(
                'h-5 min-w-[1.25rem] px-0.5 text-[10px] font-medium rounded border border-border',
                rpe === value && 'bg-primary text-primary-foreground',
                rpe <= 3 && 'hover:bg-green-100 hover:text-green-900',
                rpe > 3 && rpe <= 6 && 'hover:bg-yellow-100 hover:text-yellow-900',
                rpe > 6 && rpe <= 8 && 'hover:bg-orange-100 hover:text-orange-900',
                rpe > 8 && 'hover:bg-red-100 hover:text-red-900',
              )}
            >
              {rpe}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export function RowsResultsChrome({ resultId, sessionResult, onCaptured }: RowsResultsChromeProps) {
  const [widened, setWidened] = useState(false);
  const [wideResult, setWideResult] = useState<RowsQueryResult | undefined>(undefined);

  const sessionRun = sessionResult.runs[0];
  const blockContentId = sessionRun?.result.blockContentId;

  // Fetch the cross-version history up front: it backs both the widened view
  // and the toggle's disabled state ("no other versions").
  useEffect(() => {
    if (!blockContentId) return;
    let cancelled = false;
    const parsed = parseQuery(`rows:{block:${blockContentId}}`);
    if (!isRowsQuery(parsed)) return;
    void queryService
      .runRows(parsed)
      .then((res) => {
        if (!cancelled) setWideResult(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [blockContentId]);

  const hasOtherVersions = (wideResult?.runs.length ?? 0) > 1;

  const handleCapture = useCallback(
    async (rpe: number) => {
      await captureSessionRpe(resultId, rpe);
      onCaptured();
    },
    [resultId, onCaptured],
  );

  const runHeaderExtra = useMemo(
    () => (run: RowsRun) =>
      run.result.id === resultId ? (
        <RpeChip resultId={run.result.id} logs={run.result.data.logs ?? []} onCapture={handleCapture} />
      ) : (
        <RpeChip resultId={run.result.id} logs={run.result.data.logs ?? []} readOnly onCapture={handleCapture} />
      ),
    [resultId, handleCapture],
  );

  return (
    // mousedown is swallowed so clicking the chrome never moves the CM6
    // selection into the block (which would unmount the widget mid-click).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="flex flex-col gap-1" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="inline-flex rounded-md border border-border overflow-hidden" data-testid="widen-toggle">
          <button
            type="button"
            onClick={() => setWidened(false)}
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium transition-colors',
              !widened ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            This session
          </button>
          <button
            type="button"
            onClick={() => hasOtherVersions && setWidened(true)}
            disabled={!hasOtherVersions}
            title={hasOtherVersions ? 'All versions of this workout' : 'No other versions of this workout yet'}
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium border-l border-border transition-colors',
              widened ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              !hasOtherVersions && 'opacity-50 cursor-not-allowed',
            )}
          >
            All versions
          </button>
        </span>
        {!widened && sessionRun && (
          <RpeChip resultId={resultId} logs={sessionRun.result.data.logs ?? []} onCapture={handleCapture} />
        )}
      </div>
      {widened && wideResult ? (
        <RowsTable result={wideResult} renderRunHeaderExtra={runHeaderExtra} />
      ) : (
        <RowsTable result={sessionResult} />
      )}
    </div>
  );
}
