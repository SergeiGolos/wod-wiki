import type { ReactNode } from 'react';
import type { QueryResult } from '@/services/analytics/query';
import {
  isDashboardWidgetType,
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
import { WqlEmptyState } from './WqlEmptyState';

export interface WidgetChartProps {
  /** Raw widget type from the fence suffix; '' picks the dashboard default (table). */
  type: string;
  result: QueryResult | undefined;
  /** Fallback label for value widgets (widget title or metric). */
  label?: string;
  unit?: string;
}

/**
 * WidgetChart — dispatch a QueryResult to the chart a dashboard widget type
 * names (#899). Unknown types and types landing in #901 render loud badges /
 * placeholders instead of silently falling back. Loading and empty states
 * match the other analytics widgets.
 */
export function WidgetChart({ type, result, label, unit }: WidgetChartProps) {
  const resolved = resolveWidgetType(type);

  if (!isDashboardWidgetType(resolved)) {
    return <WidgetProblemBadge message={unknownWidgetTypeMessage(resolved)} />;
  }
  if (PLANNED_WIDGET_TYPES.includes(resolved)) {
    return <PlannedWidgetPlaceholder type={resolved} />;
  }
  if (!result) {
    return <WqlEmptyState result={result} />;
  }

  const chart = renderChart(resolved, result, label, unit);
  return <>{chart}</>;
}

function renderChart(
  type: DashboardWidgetType,
  result: QueryResult,
  label?: string,
  unit?: string,
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
