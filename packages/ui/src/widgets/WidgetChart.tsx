import type { ReactNode } from 'react';
import type { QueryResult } from '@wod-wiki/wql';
import { isDashboardWidgetType, PLANNED_WIDGET_TYPES, resolveWidgetType, unknownWidgetTypeMessage } from '@wod-wiki/wql';
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

export function WidgetChart({ type, result, label, unit, params }: WidgetChartProps) {
  if (type !== '' && !isDashboardWidgetType(type)) {
    return <WidgetProblemBadge message={unknownWidgetTypeMessage(type)} />;
  }

  const resolved = resolveWidgetType(type);

  if (!result || result.parsed.error || result.series.length === 0) {
    return <WqlEmptyState result={result} />;
  }

  return (
    <div className="w-full h-full min-h-[160px]">
      {renderChart(resolved, result, label, unit, params)}
    </div>
  );
}

function renderChart(
  type: string,
  result: QueryResult,
  label?: string,
  unit?: string,
  params?: string[],
): ReactNode {
  switch (type) {
    case 'value':
      return <QueryValue result={result} label={label ?? ''} unit={unit} />;
    case 'timeseries':
      return <WqlTimeseries result={result} unit={unit} />;
    case 'bar':
    case 'bars':
      return <WqlBars result={result} unit={unit} />;
    case 'top':
    case 'toplist':
      return <TopList result={result} unit={unit} />;
    case 'stacked':
    case 'stacked-bar':
      return <StackedBar result={result} unit={unit} />;
    case 'goal-rings':
      return <GoalRings result={result} params={params} label={label} unit={unit} />;
    case 'zone-distribution':
      return <ZoneDistribution result={result} params={params} unit={unit} />;
    case 'table':
      return <WqlTable result={result} unit={unit} />;
    default:
      if (Array.isArray(PLANNED_WIDGET_TYPES) ? (PLANNED_WIDGET_TYPES as readonly string[]).includes(type) : (PLANNED_WIDGET_TYPES as any).has?.(type)) {
        return <PlannedWidgetPlaceholder type={type} />;
      }
      return <WqlTable result={result} unit={unit} />;
  }
}

export function WidgetProblemBadge({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-testid="widget-problem"
      className="flex items-center justify-center h-full p-4 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs font-medium text-center"
    >
      {message}
    </div>
  );
}

export function ProposedMetricBadge({ metric }: { metric: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center h-full p-4 rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground text-xs text-center gap-1"
    >
      <span className="font-mono font-medium text-foreground">{metric}</span>
      <span>Calculated metric pending engine support</span>
    </div>
  );
}

function PlannedWidgetPlaceholder({ type }: { type: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-mono bg-muted/20 rounded p-4 text-center">
      widget:{type} renderer in progress
    </div>
  );
}
