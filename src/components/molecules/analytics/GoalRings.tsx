import type { QueryResult } from '@/services/analytics/query';
import { WqlEmptyState } from './WqlEmptyState';

export interface GoalRingsProps {
  result: QueryResult | undefined;
  params?: string[];
  label?: string;
  unit?: string;
}

/**
 * GoalRings — query:goal-rings widget (#901 map, format locked in #899).
 * Renders goal progress rings for target comparison (e.g. `max:calc.e1rm / $goal`).
 * Body param specifies target literal or substituted $token (params[0]).
 * Single or multi-series progress rings with percentage & current/target values.
 */
export function GoalRings({ result, params, label, unit }: GoalRingsProps) {
  if (!result || result.series.length === 0) {
    return <WqlEmptyState result={result} />;
  }

  const rawTarget = params && params.length > 0 ? params[0] : undefined;
  const targetValue = rawTarget ? parseFloat(rawTarget) : undefined;
  const hasValidTarget = targetValue !== undefined && !isNaN(targetValue) && targetValue > 0;

  const displayUnit = unit ?? result.unit ?? result.parsed.displayUnit ?? '';

  return (
    <div
      data-testid="goal-rings"
      className="h-full flex items-center justify-center p-2 gap-4 flex-wrap overflow-auto"
    >
      {result.series.map((s, idx) => {
        const currentValue =
          s.points.length > 0 ? s.points[s.points.length - 1].value : 0;
        const ringLabel =
          result.series.length > 1
            ? s.label || s.key
            : label || result.parsed.metric || 'Goal';

        const pct = hasValidTarget
          ? Math.round((currentValue / (targetValue as number)) * 100)
          : undefined;

        return (
          <GoalRingItem
            key={s.key || idx}
            label={ringLabel}
            current={currentValue}
            target={hasValidTarget ? (targetValue as number) : undefined}
            pct={pct}
            unit={displayUnit}
          />
        );
      })}
    </div>
  );
}

function GoalRingItem({
  label,
  current,
  target,
  pct,
  unit,
}: {
  label: string;
  current: number;
  target?: number;
  pct?: number;
  unit: string;
}) {
  const formattedCurrent = current.toLocaleString();
  const formattedTarget = target ? target.toLocaleString() : undefined;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = pct !== undefined ? Math.min(Math.max(pct, 0), 100) : 0;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  let strokeColor = 'stroke-primary';
  let textColor = 'text-foreground';
  if (pct !== undefined) {
    if (pct >= 100) {
      strokeColor = 'stroke-emerald-500';
      textColor = 'text-emerald-500 font-bold';
    } else if (pct >= 50) {
      strokeColor = 'stroke-primary';
    } else {
      strokeColor = 'stroke-amber-500';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-w-28 text-center" data-testid="goal-ring-item">
      <div className="relative size-24 flex items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-muted/40 fill-none"
            strokeWidth="8"
          />
          {pct !== undefined && (
            <circle
              cx="48"
              cy="48"
              r={radius}
              className={`fill-none ${strokeColor} transition-all duration-500 ease-out`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-base font-bold tabular-nums ${textColor}`}>
            {pct !== undefined ? `${pct}%` : formattedCurrent}
          </span>
          {pct !== undefined && unit ? (
            <span className="text-[10px] text-muted-foreground uppercase">{unit}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-1 text-xs font-medium text-foreground truncate max-w-36" title={label}>
        {label}
      </div>
      <div className="text-[11px] text-muted-foreground tabular-nums">
        {target !== undefined ? (
          <span>
            {formattedCurrent} / {formattedTarget} {unit}
          </span>
        ) : (
          <span>
            {formattedCurrent} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
