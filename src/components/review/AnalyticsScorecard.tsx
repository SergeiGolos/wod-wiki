import React from 'react';
import { MetricType } from '@/core/models/Metric';
import { type ProjectionResult } from '@/core/analytics/ProjectionResult';
import { cn } from '@/lib/utils';

interface AnalyticsScorecardProps {
  projections: ProjectionResult[];
  className?: string;
}

const METRIC_ICONS: Record<string, string> = {
  volume: '💪',
  rep: '💪',
  distance: '📏',
  load: '⏱️',
  metric: '🏃', // for met-minutes/effort
  duration: '⏱️',
};

const METRIC_COLORS: Record<string, string> = {
  volume: 'border-metric-rep text-metric-rep', // prompt says volume uses rep colors
  rep: 'border-metric-rep text-metric-rep',
  distance: 'border-metric-distance text-metric-distance',
  load: 'border-metric-time text-metric-time',
  metric: 'border-metric-effort text-metric-effort',
  duration: 'border-metric-time text-metric-time',
};

export const AnalyticsScorecard: React.FC<AnalyticsScorecardProps> = ({ projections, className }) => {
  if (projections.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-[11px] font-bold tracking-label text-muted-foreground uppercase">
        📊 Session Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {projections.map((proj, idx) => {
          const type = (proj.metricType?.toString().toLowerCase() || 'metric') as string;
          const colorClass = METRIC_COLORS[type] || 'border-primary text-primary';
          const icon = METRIC_ICONS[type] || '📊';

          return (
            <div
              key={`${proj.name}-${idx}`}
              className={cn(
                "relative flex flex-col p-4 bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[120px] justify-center",
                "before:absolute before:top-0 before:left-0 before:right-0 before:h-1",
                colorClass.split(' ')[0].replace('border-', 'before:bg-') // Extract border color for top stripe
              )}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm" role="img" aria-label={proj.name}>
                  {icon}
                </span>
                <span className="text-[10px] font-bold tracking-label uppercase text-muted-foreground">
                  {proj.name}
                </span>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-bold tracking-display tabular-nums", colorClass.split(' ')[1])}>
                  {proj.value.toLocaleString()}
                </span>
                {proj.unit && (
                  <span className="px-2 py-0.5 rounded-pill bg-muted text-[10px] font-bold text-muted-foreground">
                    {proj.unit}
                  </span>
                )}
              </div>

              <div className="mt-2 text-[9px] text-muted-foreground italic">
                {proj.origin || 'analyzed'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
