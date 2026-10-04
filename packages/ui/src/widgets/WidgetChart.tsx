import React, { type ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { QueryResult } from '@bitcobblers/wod-wiki-wql';
import { isDashboardWidgetType, PLANNED_WIDGET_TYPES, resolveWidgetType, unknownWidgetTypeMessage } from '@bitcobblers/wod-wiki-wql';
import { SERIES_COLORS } from './chartPalette';
import { compactNumber } from './chartData';
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
  /** Fence-tag presentation attributes (decision 22) — preferred over legacy positional params. */
  attributes?: Record<string, string>;
}

export function WidgetChart({ type, result, label, unit, params, attributes }: WidgetChartProps) {
  if (type !== '' && !isDashboardWidgetType(type)) {
    return <WidgetProblemBadge message={unknownWidgetTypeMessage(type)} />;
  }

  const resolved = resolveWidgetType(type);

  if (resolved === 'table' && (result as any)?.table) {
    return (
      <div className="w-full h-full min-h-[160px]">
        <TabularTable table={(result as any).table} />
      </div>
    );
  }
  if (resolved === 'list' && (result as any)?.parsed?.family === 'find') {
    return (
      <div className="w-full h-full min-h-[160px]">
        <ThingList result={result as any} />
      </div>
    );
  }

  if (!result || result.parsed.error || ('series' in result && result.series.length === 0)) {
    return <WqlEmptyState result={result} />;
  }

  return (
    <div className="w-full h-full min-h-[160px]">
      {renderChart(resolved, result, label, unit, params, attributes)}
    </div>
  );
}

function renderChart(
  type: string,
  result: QueryResult,
  label?: string,
  unit?: string,
  params?: string[],
  attributes?: Record<string, string>,
): ReactNode {
  switch (type) {
    case 'value':
      return <QueryValue result={result} label={label ?? ''} unit={unit} />;
    case 'donut':
      return <WqlDonut result={result} unit={unit} label={label} />;
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
      return <GoalRings result={result} attributes={attributes} params={params} label={label} unit={unit} />;
    case 'zone-distribution':
      return <ZoneDistribution result={result} attributes={attributes} params={params} unit={unit} />;
    case 'table':
      return <WqlTable result={result} unit={unit} />;
    default:
      if (Array.isArray(PLANNED_WIDGET_TYPES) ? (PLANNED_WIDGET_TYPES as readonly string[]).includes(type) : (PLANNED_WIDGET_TYPES as unknown as { has?: (t: string) => boolean }).has?.(type)) {
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

/** Donut (`:donut` sink / dashboard `donut` widget): one slice per series —
 *  the series' point total. Recharts Pie with an inner radius; an
 *  accessible text summary rides alongside for screen readers. */
function WqlDonut({ result, unit, label }: { result: QueryResult; unit?: string; label?: string }) {
  const data = result.series.map((s, i) => ({
    name: s.label,
    value: s.points.reduce((sum, p) => sum + (p.missing ? 0 : p.value), 0),
    fill: SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  const slices = data.filter((d) => d.value > 0);
  const summaryUnit = result.series[0]?.unit ?? unit ?? '';
  const summary = slices.length > 0
    ? `${label ?? 'distribution'}: ${slices.map((d) => `${d.name} ${compactNumber(d.value)}${summaryUnit}`).join(', ')}`
    : 'no data';

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      role="img"
      aria-label={summary}
      data-testid="wql-donut"
    >
      {slices.length === 0 ? (
        <span className="text-xs text-muted-foreground">No data</span>
      ) : (
        <ResponsiveDonut data={slices} unit={summaryUnit} />
      )}
    </div>
  );
}

function ResponsiveDonut({ data, unit }: { data: Array<{ name: string; value: number; fill: string }>; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="hsl(var(--background))"
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${compactNumber(Number(value))}${unit}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TabularTable({ table }: { table: { columns: Array<{ name: string; unit?: string }>; rows: Array<Record<string, unknown>>; groups?: Array<{ key: string; label: string; rows: Array<Record<string, unknown>> }> } }) {
  return (
    <div className="h-full overflow-auto" data-testid="tabular-table">
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-left">
            {table.columns.map((c) => (
              <th key={c.name} className="py-1 px-2 font-medium">
                {c.name}{c.unit ? ` (${c.unit})` : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.groups ? (
            table.groups.map((group) => (
              <React.Fragment key={group.key}>
                <tr className="bg-muted/40 font-semibold border-b border-border/60">
                  <td colSpan={table.columns.length} className="py-1 px-2">
                    {group.label}
                  </td>
                </tr>
                {group.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                    {table.columns.map((c) => (
                      <td key={c.name} className="py-1 px-2 whitespace-nowrap">
                        {String(row[c.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))
          ) : (
            table.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                {table.columns.map((c) => (
                  <td key={c.name} className="py-1 px-2 whitespace-nowrap">
                    {String(row[c.name] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ThingList({ result }: { result: any }) {
  const items = result.notes?.length ? result.notes : result.blocks?.length ? result.blocks : result.efforts?.length ? result.efforts : result.runs ?? [];
  return (
    <div className="h-full overflow-auto space-y-1" data-testid="thing-list">
      {items.map((item: any, i: number) => (
        <div key={item.id ?? item.resultId ?? i} className="py-1 px-2 text-xs border-b border-border/40 truncate">
          {item.title ?? item.label ?? item.noteTitle ?? item.id ?? item.resultId}
        </div>
      ))}
    </div>
  );
}
