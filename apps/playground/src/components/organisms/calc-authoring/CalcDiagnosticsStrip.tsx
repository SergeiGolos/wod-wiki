/**
 * CalcDiagnosticsStrip (#880) — renders the static diagnostics for a draft
 * calc line: the inferred dimension vector (and named compound, if known)
 * plus any registration errors/unknown symbols. Backed by
 * `analyzeCalcLine` (the engine's real static checker).
 */

import { CalcAnalysis } from './calcDiagnostics';

export interface CalcDiagnosticsStripProps {
  analysis: CalcAnalysis;
}

export function CalcDiagnosticsStrip({ analysis }: CalcDiagnosticsStripProps) {
  const { dim, compound, diagnostics } = analysis;
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const ok = errors.length === 0 && warnings.length === 0 && dim !== undefined;

  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-2 text-xs" data-testid="calc-diagnostics">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {dim ? (
          <div className="text-muted-foreground">
            computes <b className="text-foreground">{fmtDim(dim)}</b>
            {compound && <span className="text-purple-400 dark:text-purple-300"> → {compound}</span>}
          </div>
        ) : (
          !ok && <div className="text-muted-foreground">dimension unknown</div>
        )}
        {ok && <span className="text-signal-positive">✓ valid</span>}
      </div>
      {errors.map((d, i) => (
        <div key={`e-${i}`} className="text-destructive">⚠ {d.message}</div>
      ))}
      {warnings.map((d, i) => (
        <div key={`w-${i}`} className="text-signal-caution">⚠ {d.message}</div>
      ))}
      {errors.length === 0 && warnings.length === 0 && dim === undefined && (
        <div className="text-muted-foreground">Type a calc line to see diagnostics.</div>
      )}
    </div>
  );
}

const AXES: [string, string][] = [['L', 'length'], ['M', 'mass'], ['T', 'time'], ['C', 'count'], ['E', 'energy']];

function fmtDim(d: readonly number[]): string {
  const parts: string[] = [];
  d.forEach((x, i) => { if (x !== 0) parts.push(x === 1 ? AXES[i][1] : `${AXES[i][1]}${x}`); });
  return parts.length ? parts.join('·') : 'dimensionless';
}
