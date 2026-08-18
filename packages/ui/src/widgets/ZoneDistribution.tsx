import type { QueryResult } from '@bitcobblers/wod-wiki-engine';
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

export function ZoneDistribution({ result, params }: ZoneDistributionProps) {
  if (!result || result.series.length === 0) {
    return <WqlEmptyState result={result} />;
  }

  let targetLow = 80;
  let targetMod = 0;
  let targetHigh = 20;

  if (params && params.length > 0) {
    const rawTokens = params[0].trim().split(/\s+/);
    if (rawTokens.length >= 3) {
      targetLow = parseTargetNum(rawTokens[0], 80);
      targetMod = parseTargetNum(rawTokens[1], 0);
      targetHigh = parseTargetNum(rawTokens[2], 20);
    } else if (rawTokens.length === 2) {
      targetLow = parseTargetNum(rawTokens[0], 80);
      targetHigh = parseTargetNum(rawTokens[1], 20);
      targetMod = Math.max(0, 100 - (targetLow + targetHigh));
    } else if (rawTokens.length === 1) {
      targetLow = parseTargetNum(rawTokens[0], 80);
      targetHigh = Math.max(0, 100 - targetLow);
      targetMod = 0;
    }
  }

  let lowVal = 0;
  let modVal = 0;
  let highVal = 0;

  result.series.forEach((s, idx) => {
    const lastPoint = s.points.length > 0 ? s.points[s.points.length - 1] : undefined;
    const val = lastPoint ? lastPoint.value : 0;
    const nameLower = (s.label || s.key || '').toLowerCase();

    if (nameLower.includes('low') || nameLower.includes('z1') || nameLower.includes('z2') || idx === 0) {
      lowVal += val;
    } else if (nameLower.includes('mod') || nameLower.includes('tempo') || nameLower.includes('z3') || idx === 1) {
      modVal += val;
    } else if (nameLower.includes('high') || nameLower.includes('hard') || nameLower.includes('z4') || nameLower.includes('z5') || idx === 2) {
      highVal += val;
    } else {
      lowVal += val;
    }
  });

  const grandTotal = lowVal + modVal + highVal;
  const actualLowPct = grandTotal > 0 ? Math.round((lowVal / grandTotal) * 100) : 0;
  const actualModPct = grandTotal > 0 ? Math.round((modVal / grandTotal) * 100) : 0;
  const actualHighPct = grandTotal > 0 ? Math.round((highVal / grandTotal) * 100) : 0;

  const zones: ZoneConfig[] = [
    {
      key: 'low',
      label: 'Low / Aerobic',
      sublabel: 'Zone 1–2',
      colorClass: 'bg-emerald-500',
      bgClass: 'text-emerald-500',
      target: targetLow,
      actual: lowVal,
      pct: actualLowPct,
    },
    {
      key: 'moderate',
      label: 'Moderate / Tempo',
      sublabel: 'Zone 3',
      colorClass: 'bg-amber-500',
      bgClass: 'text-amber-500',
      target: targetMod,
      actual: modVal,
      pct: actualModPct,
    },
    {
      key: 'high',
      label: 'High / Anaerobic',
      sublabel: 'Zone 4–5',
      colorClass: 'bg-rose-500',
      bgClass: 'text-rose-500',
      target: targetHigh,
      actual: highVal,
      pct: actualHighPct,
    },
  ];

  return (
    <div
      className="flex flex-col justify-between h-full p-2 gap-4"
      data-testid="zone-distribution-widget"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
          <span>Actual vs Target Distribution</span>
          <span className="font-mono text-[10px]">
            T: {targetLow}/{targetMod}/{targetHigh}%
          </span>
        </div>
        <div className="w-full h-5 rounded-md overflow-hidden flex bg-muted/60 p-0.5 gap-0.5">
          {zones.map((z) =>
            z.pct > 0 ? (
              <div
                key={z.key}
                className={`${z.colorClass} h-full rounded-sm transition-all duration-500 flex items-center justify-center`}
                style={{ width: `${z.pct}%` }}
                title={`${z.label}: ${z.pct}% (Target: ${z.target}%)`}
              >
                {z.pct >= 10 && (
                  <span className="text-[10px] font-bold text-white leading-none drop-shadow-sm">
                    {z.pct}%
                  </span>
                )}
              </div>
            ) : null,
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {zones.map((z) => {
          const delta = z.pct - z.target;
          return (
            <div
              key={z.key}
              className="flex flex-col bg-muted/20 border border-border/50 rounded-lg p-2 text-center"
              data-testid={`zone-card-${z.key}`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${z.colorClass}`} />
                <span className="text-xs font-semibold text-foreground truncate">{z.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mb-1.5">{z.sublabel}</span>

              <div className="flex items-baseline justify-center gap-1">
                <span className="text-lg font-bold tabular-nums text-foreground">{z.pct}%</span>
                <span className="text-[10px] text-muted-foreground">/ {z.target}%</span>
              </div>

              {z.target > 0 && (
                <span
                  className={`text-[10px] font-medium tabular-nums mt-0.5 ${
                    Math.abs(delta) <= 5
                      ? 'text-emerald-500'
                      : delta > 0
                        ? 'text-amber-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {delta > 0 ? `+${delta}%` : `${delta}%`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
