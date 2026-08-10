import type { ReactNode } from 'react';
import type { QueryResult } from '@/services/analytics/query';
import {
  isDashboardWidgetType,
  isProposedMetric,
  PLANNED_WIDGET_TYPES,
  resolveWidgetType,
  unknownWidgetTypeMessage,
  type DashboardWidgetType,
} from '@/lib/dashboard/model';
import { QueryValue } from './QueryValue';
import { WqlTimeseries } from './WqlTimeseries';
import { WqlBars } from './WqlBars';
import { WqlTable } from './WqlTable';
import { TopList } from './TopList';
import { StackedBar } from './StackedBar';
import { GoalRings } from './GoalRings';
import { ZoneDistribution } from './ZoneDistribution';
import { WqlEmptyState } from './WqlEmptyState';

export interface WidgetChartProps {
  /** Raw widget type from the fence suffix; '' picks the dashboard default (table). */
  type: string;
  result: QueryResult | undefined;
  /** Fallback label for value widgets (widget title or metric). */
  label?: string;
  unit?: string;
  /** Positional widget parameters from the block body (e.g. goal target or zone targets). */
  params?: string[];
}

/**
 * WidgetChart — dispatch a QueryResult to the chart a dashboard widget type
 * names (#899). Unknown types and proposed metrics render loud badges /
 * placeholders instead of silently falling back. Loading and empty states
 * match the other analytics widgets.
 */
export function WidgetChart({ type, result, label, unit, params }: WidgetChartProps) {
  const resolved = resolveWidgetType(type);

  if (!isDashboardWidgetType(resolved)) {
    return <WidgetProblemBadge message={unknownWidgetTypeMessage(resolved)} />;
  }
  if (PLANNED_WIDGET_TYPES.includes(resolved)) {
    return <PlannedWidgetPlaceholder type={resolved} />;
  }
  if (result?.parsed?.metric && isProposedMetric(result.parsed.metric)) {
    return <ProposedMetricBadge metric={result.parsed.metric} />;
  }
  if (!result) {
    return <WqlEmptyState result={result} />;
  }

  const chart = renderChart(resolved, result, label, unit, params);
  return <>{chart}</>;
}

function renderChart(
  type: DashboardWidgetType,
  result: QueryResult,
  label?: string,
  unit?: string,
  params?: string[],
): ReactNode {
  switch (type) {
    case 'value':
      return <QueryValue result={result} unit={unit ?? ''} label={label ?? result.parsed.metric} />;
    case 'timeseries':
      return <WqlTimeseries result={result} unit={unit} />;
    case 'bar':
      return <WqlBars result={result} unit={unit} />;
    case 'toplist':
      return <TopList result={result} unit={unit} />;
    case 'stacked-bar':
      return <StackedBar result={result} unit={unit} />;
    case 'goal-rings':
      return <GoalRings result={result} params={params} label={label} unit={unit} />;
    case 'zone-distribution':
      return <ZoneDistribution result={result} params={params} unit={unit} />;
    case 'table':
    default:
      return <WqlTable result={result} unit={unit} />;
  }
}
/** Loud badge for malformed / unknown widget types — never a silent fallback. */
export function WidgetProblemBadge({ message }: { message: string }) {
  return (
    <div
      data-testid="widget-problem"
      className="h-full min-h-16 flex items-center justify-center rounded-lg border border-dashed border-destructive/60 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive"
    >
      {message}
    </div>
  );
}
/** Badge for calc.* metrics not yet implemented in the engine — renders a
 * labeled placeholder until the metric lands as a seed. */
export function ProposedMetricBadge({ metric }: { metric: string }) {
  return (
    <div
      data-testid="widget-proposed-metric"
      className="h-full min-h-16 flex items-center justify-center rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-center text-xs text-amber-600 dark:text-amber-400"
    >
      <span>
        proposed metric <span className="font-mono font-semibold">{metric}</span> — not yet implemented
      </span>
    </div>
  );
}

/** Placeholder for locked widget types whose renderer lands in #901. */
function PlannedWidgetPlaceholder({ type }: { type: string }) {
  return (
    <div
      data-testid="widget-planned"
      className="h-full min-h-16 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground"
    >
      <span>
        <span className="font-mono text-foreground">{type}</span> — widget renderer lands in #901
      </span>
    </div>
  );
}
