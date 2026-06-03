import React from 'react';
import { type ProjectionResult } from '@/core/analytics/ProjectionResult';
import { cn } from '@/lib/utils';

interface AnalyticsScorecardProps {
  projections: ProjectionResult[];
  className?: string;
  /** Called when a metric card is selected (for filtering/sorting the grid) */
  onSelectMetric?: (name: string) => void;
  /** Currently selected metric name */
  selectedMetric?: string | null;
}

const METRIC_ICONS: Record<string, string> = {
  volume: '💪',
  rep: '💪',
  distance: '📏',
  load: '⏱️',
  metric: '🏃',
  duration: '⏱️',
};

const METRIC_COLORS: Record<string, { border: string; text: string; bar: string; bg: string }> = {
  volume:   { border: 'border-metric-rep',       text: 'text-metric-rep',       bar: 'bg-metric-rep',       bg: 'bg-metric-rep/10' },
  rep:      { border: 'border-metric-rep',       text: 'text-metric-rep',       bar: 'bg-metric-rep',       bg: 'bg-metric-rep/10' },
  distance: { border: 'border-metric-distance',  text: 'text-metric-distance',  bar: 'bg-metric-distance',  bg: 'bg-metric-distance/10' },
  load:     { border: 'border-metric-time',      text: 'text-metric-time',      bar: 'bg-metric-time',      bg: 'bg-metric-time/10' },
  metric:   { border: 'border-metric-effort',    text: 'text-metric-effort',    bar: 'bg-metric-effort',    bg: 'bg-metric-effort/10' },
  duration: { border: 'border-metric-time',      text: 'text-metric-time',      bar: 'bg-metric-time',      bg: 'bg-metric-time/10' },
};
/** Resolve colour/icon tokens for a given projection. */
export function getMetricStyle(type: string) {
  const key = type.toLowerCase();
  return {
    icon: METRIC_ICONS[key] || '📊',
    colors: METRIC_COLORS[key] || {
      border: 'border-primary',
      text: 'text-primary',
      bar: 'bg-primary',
      bg: 'bg-primary/10',
    },
  };
}

/**
 * AnalyticsScorecard — Compact horizontal carousel of session summary metrics.
 *
 * Renders as a horizontally scrollable row of cards, matching the POC design:
 * - Each card shows label, value, unit, and a progress bar
 * - Cards are selectable (click to highlight / filter)
 * - Compact sizing for information density
 */
export const AnalyticsScorecard: React.FC<AnalyticsScorecardProps> = ({
  projections,
  className,
  onSelectMetric,
  selectedMetric,
}) => {
  if (projections.length === 0) return null;

  // Normalize values to 0-100% for progress bars (relative to max)
  const maxValue = Math.max(...projections.map(p => p.value));

  return (
    <section className={cn("relative py-2 shrink-0", className)}>
      <div className="flex overflow-x-auto no-scrollbar gap-3 px-4">
        {projections.map((proj, idx) => {
          const type = (proj.metricType?.toString().toLowerCase() || 'metric') as string;
          const colors = METRIC_COLORS[type] || {
            border: 'border-primary',
            text: 'text-primary',
            bar: 'bg-primary',
            bg: 'bg-primary/10',
          };
          const icon = METRIC_ICONS[type] || '📊';
          const isSelected = selectedMetric === proj.name;
          const percent = maxValue > 0 ? Math.round((proj.value / maxValue) * 100) : 0;

          return (
            <button
              key={`${proj.name}-${idx}`}
              onClick={() => onSelectMetric?.(isSelected ? '' : proj.name)}
              className={cn(
                "min-w-[130px] flex-shrink-0 rounded-lg p-3 transition-all cursor-pointer text-left",
                "border hover:bg-muted/50",
                isSelected
                  ? cn("border-2", colors.border, "shadow-sm")
                  : "border-border"
              )}
            >
              {/* Label */}
              <span className="text-[10px] font-bold tracking-label uppercase text-muted-foreground block mb-1">
                {icon} {proj.name}
              </span>

              {/* Value + Unit */}
              <div className="flex items-baseline gap-1">
                <span className={cn("text-lg font-bold tabular-nums", colors.text)}>
                  {proj.value.toLocaleString()}
                </span>
                {proj.unit && (
                  <span className="text-[10px] text-muted-foreground">
                    {proj.unit}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", colors.bar)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
