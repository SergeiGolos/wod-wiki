import type { QueryResult } from '@/services/analytics/query';
import { WqlEmptyState } from './WqlEmptyState';

export interface ZoneDistributionProps {
  result: QueryResult | undefined;
  params?: string[];
  unit?: string;
}

interface ZoneConfig {
  key: 'low' | 'moderate' | 'high';
  label: string;
  sublabel: string;
  colorClass: string;
  bgClass: string;
  target: number;
  actual: number;
  pct: number;
}
function parseTargetNum(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

/**
 * ZoneDistribution — query:zone-distribution widget (#901 map, format locked in #899).
 * Renders zone percentage distribution vs target bands over a `by {intensity}` query.
 * Body params specify target percentages: `query / t1 t2 t3` for low, moderate, high.
 * Default targets if omitted: `80 0 20` (polarized 80/20).
 */
export function ZoneDistribution({ result, params }: ZoneDistributionProps) {
  if (!result || result.series.length === 0) {
    return <WqlEmptyState result={result} />;
  }

  // Target parsing: positional for low, moderate, high.
  // Default is 80 0 20 (polarized 80/20) if omitted.
  let targetLow = 80;
  let targetMod = 0;
  let targetHigh = 20;

  if (params && params.length > 0) {
    if (params.length === 1) {
      targetLow = parseTargetNum(params[0], 80);
      targetMod = 0;
      targetHigh = Math.max(0, 100 - targetLow);
    } else if (params.length === 2) {
      targetLow = parseTargetNum(params[0], 80);
      targetMod = 0;
      targetHigh = parseTargetNum(params[1], 20);
    } else if (params.length >= 3) {
      targetLow = parseTargetNum(params[0], 80);
      targetMod = parseTargetNum(params[1], 0);
      targetHigh = parseTargetNum(params[2], 20);
    }
  }

  // Map result.series to low / moderate / high totals
  let lowVal = 0;
  let modVal = 0;
  let highVal = 0;

  result.series.forEach((s, idx) => {
    const key = (s.key || s.label || '').toLowerCase();
    const val = s.points.reduce((sum, p) => sum + p.value, 0);

    if (key.includes('low') || key.includes('easy') || key.includes('z1') || key.includes('z2')) {
      lowVal += val;
    } else if (key.includes('mod') || key.includes('tempo') || key.includes('z3') || key.includes('z4')) {
      modVal += val;
    } else if (key.includes('high') || key.includes('hard') || key.includes('z5') || key.includes('anaerobic')) {
      highVal += val;
    } else {
      if (idx === 0) lowVal += val;
      else if (idx === 1) modVal += val;
      else highVal += val;
    }
  });

  const grandTotal = lowVal + modVal + highVal;
  const actualLowPct = grandTotal > 0 ? Math.round((lowVal / grandTotal) * 100) : 0;
  const actualModPct = grandTotal > 0 ? Math.round((modVal / grandTotal) * 100) : 0;
  const actualHighPct = grandTotal > 0 ? Math.round((highVal / grandTotal) * 100) : 0;

  const zones: ZoneConfig[] = [
    {
      key: 'low',
      label: 'Low',
      sublabel: 'Zone 1–2 / Aerobic',
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-500',
      target: targetLow,
      actual: lowVal,
      pct: actualLowPct,
    },
    {
      key: 'moderate',
      label: 'Moderate',
      sublabel: 'Zone 3–4 / Tempo',
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500',
      target: targetMod,
      actual: modVal,
      pct: actualModPct,
    },
    {
      key: 'high',
      label: 'High',
      sublabel: 'Zone 5 / Anaerobic',
      colorClass: 'text-rose-500',
      bgClass: 'bg-rose-500',
      target: targetHigh,
      actual: highVal,
      pct: actualHighPct,
    },
  ];

  return (
    <div
      data-testid="zone-distribution"
      className="h-full flex flex-col justify-between p-2 space-y-3 overflow-auto"
    >
      {/* Summary header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">
          Distribution: {actualLowPct} / {actualModPct} / {actualHighPct}%
        </span>
        <span className="text-[11px] text-muted-foreground">
          Target: {targetLow} / {targetMod} / {targetHigh}%
        </span>
      </div>

      {/* Multi-segment stacked horizontal bar */}
      <div className="h-4 w-full rounded-full bg-muted/40 overflow-hidden flex">
        {zones.map((zone) =>
          zone.pct > 0 ? (
            <div
              key={zone.key}
              style={{ width: `${zone.pct}%` }}
              className={`h-full ${zone.bgClass} transition-all duration-300`}
              title={`${zone.label}: ${zone.pct}% (Target ${zone.target}%)`}
            />
          ) : null,
        )}
      </div>

      {/* Zone Detail Rows */}
      <div className="space-y-1.5 pt-1">
        {zones.map((zone) => {
          const diff = zone.pct - zone.target;
          const diffText = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : 'on target';
          return (
            <div key={zone.key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${zone.bgClass}`} />
                <span className="font-medium text-foreground">{zone.label}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  ({zone.sublabel})
                </span>
              </div>

              <div className="flex items-center gap-3 tabular-nums">
                <span className="font-semibold text-foreground">{zone.pct}%</span>
                <span className="text-[11px] text-muted-foreground w-16 text-right">
                  Target {zone.target}%
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    Math.abs(diff) <= 3
                      ? 'bg-muted text-muted-foreground'
                      : diff > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {diffText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
