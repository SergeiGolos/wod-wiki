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
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs" data-testid="calc-diagnostics">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {dim ? (
          <div className="text-zinc-400">
            computes <b className="text-zinc-200">{fmtDim(dim)}</b>
            {compound && <span className="text-purple-400"> → {compound}</span>}
          </div>
        ) : (
          !ok && <div className="text-zinc-500">dimension unknown</div>
        )}
        {ok && <span className="text-emerald-400">✓ valid</span>}
      </div>
      {errors.map((d, i) => (
        <div key={`e-${i}`} className="text-red-400">⚠ {d.message}</div>
      ))}
      {warnings.map((d, i) => (
        <div key={`w-${i}`} className="text-amber-400">⚠ {d.message}</div>
      ))}
      {errors.length === 0 && warnings.length === 0 && dim === undefined && (
        <div className="text-zinc-500">Type a calc line to see diagnostics.</div>
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
