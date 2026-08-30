/**
 * CalcPreviewPanel (#880) — live preview of a draft calc against a stored
 * workout via the headless engine (`runCalcPreview`). Segment scope shows
 * per-segment annotations; workout scope shows running totals after each
 * line; store scope shows the trailing-window series (fixture drain).
 */

import { useMemo } from 'react';
import { CalcScope } from '@bitcobblers/wod-wiki-engine';
import { CalcAnalysis } from './calcDiagnostics';
import { runCalcPreview } from './calcPreview';
import { previewWorkoutLogs, previewBlock } from './previewWorkout';

export interface CalcPreviewPanelProps {
  scope: CalcScope;
  analysis: CalcAnalysis;
  vo2max?: number;
  sessionRpe?: number;
}

function fmtVal(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

export function CalcPreviewPanel({ scope, analysis, vo2max }: CalcPreviewPanelProps) {
  const validDefs = useMemo(
    () => analysis.defs.filter(() => analysis.diagnostics.length === 0),
    [analysis],
  );
  const target = validDefs[0];

  const result = useMemo(() => {
    if (!target) return undefined;
    return runCalcPreview({
      logs: previewWorkoutLogs,
      block: previewBlock,
      defs: validDefs,
      scope,
      vo2max,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, scope, vo2max]);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3 text-xs" data-testid="calc-preview">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Live preview — {scope === 'store' ? 'last 7 of 28 fixture days' : 'Fran (fixture)'}
      </div>
      {!target && <div className="text-muted-foreground">Enter a valid calc line to see live results.</div>}
      {target && result?.rows && (
        <div className="space-y-1 font-mono">
          {result.rows.length === 0 && <div className="text-muted-foreground">No applicable segments.</div>}
          {result.rows.map((row, i) => (
            <div key={i} className="flex justify-between text-foreground">
              <span className="text-muted-foreground">{row ? row.label : `segment ${i + 1}`}</span>
              <span className={row ? 'text-sky-300 dark:text-sky-400' : 'text-muted-foreground'}>
                {row ? `${row.text}${row.unit ? ` ${row.unit}` : ''}${row.estimated ? ' (est.)' : ''}` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
      {target && result?.series && (
        <div className="space-y-1 font-mono">
          {result.series.map((v, i) => (
            <div key={i} className="flex justify-between text-foreground">
              <span className="text-muted-foreground">D-{6 - i}</span>
              <span className="text-sky-300 dark:text-sky-400">{fmtVal(v)}</span>
            </div>
          ))}
        </div>
      )}
      {result?.errors?.length ? result.errors.map((e, i) => (
        <div key={`e-${i}`} className="text-destructive">⚠ {e}</div>
      )) : null}
    </div>
  );
}
