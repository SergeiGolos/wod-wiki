/**
 * useGraphData — Derive chart data from grid rows + tagged columns.
 *
 * Transforms the filtered/sorted GridRow[] into a time-series–like
 * data array suitable for Recharts, plus AnalyticsGraphConfig[] describing
 * each line to render.
 *
 * Data points are indexed by row index (execution order) rather than
 * wall-clock time, making the chart a row-level metric plot.
 */

import { useMemo } from 'react';
import { MetricType } from '@/core/models/Metric';
import type { AnalyticsGraphConfig } from '@/core/models/AnalyticsModels';
import type { GridRow } from './types';
import type { ColumnDef, ComputeContext } from './column-definition-language';
import { extractGraphValue } from './interpreters';

// ─── Public Interface ──────────────────────────────────────────

export interface GraphDataPoint {
  /** Row index (1-based execution order) */
  index: number;
  /** Row label (block key or effort name) */
  label: string;
  /** Dynamic metric values keyed by column id */
  [key: string]: number | string;
}

export interface UseGraphDataOptions {
  /** Filtered/sorted grid rows */
  rows: GridRow[];
  /** Column definitions (all, including hidden) */
  columns: ColumnDef[];
  /** IDs of columns tagged for graphing */
  graphTaggedColumnIds: string[];
  /** Currently selected row/segment IDs (for highlight) */
  selectedIds: Set<number>;
  /** Optional definition map for dependency resolution on derived columns */
  definitionMap?: ReadonlyMap<string, ColumnDef>;
}

export interface UseGraphDataReturn {
  /** Data points for the chart (one per visible row) */
  data: GraphDataPoint[];
  /** Graph config per tagged column (color, label, unit) */
  graphConfigs: AnalyticsGraphConfig[];
  /** Whether there is any data worth showing */
  hasData: boolean;
}

export function useGraphData(options: UseGraphDataOptions): UseGraphDataReturn {
  const { rows, columns, graphTaggedColumnIds, definitionMap } = options;

  const graphConfigs = useMemo(
    () => buildGraphConfigs(graphTaggedColumnIds, columns),
    [graphTaggedColumnIds, columns],
  );

  const data = useMemo(
    () => buildDataPoints(rows, graphTaggedColumnIds, columns, definitionMap),
    [rows, graphTaggedColumnIds, columns, definitionMap],
  );

  const hasData = graphConfigs.length > 0 && data.length > 0;

  return { data, graphConfigs, hasData };
}

// ─── Graph Config Builder ──────────────────────────────────────

function buildGraphConfigs(
  taggedIds: string[],
  columns: ColumnDef[],
): AnalyticsGraphConfig[] {
  const configs: AnalyticsGraphConfig[] = [];
  for (const colId of taggedIds) {
    const col = columns.find((c) => c.id === colId);
    if (!col) continue;
    configs.push({
      id: colId,
      label: col.label,
      unit: getUnitForColumn(col),
      color: getColorForColumn(col),
      dataKey: colId,
      icon: col.icon,
    });
  }
  return configs;
}

// ─── Data Point Builder ────────────────────────────────────────

function buildDataPoints(
  rows: GridRow[],
  taggedIds: string[],
  columns: ColumnDef[],
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): GraphDataPoint[] {
  if (taggedIds.length === 0) return [];

  return rows.map((row, rowIndex) => {
    const point: GraphDataPoint = {
      index: row.index,
      label: row.sourceBlockKey,
    };

    for (const colId of taggedIds) {
      const col = columns.find((c) => c.id === colId);
      if (!col || !col.graph) {
        point[colId] = 0;
        continue;
      }
      const ctx: ComputeContext = {
        allRows: rows,
        rowIndex,
        columnDef: col,
        dependencies: new Map(),
      };
      point[colId] = extractGraphValue(row, col, ctx, definitionMap) ?? 0;
    }

    return point;
  });
}

// ─── Helpers ───────────────────────────────────────────────────

function getColorForColumn(col: ColumnDef): string {
  if (col.graph?.color) {
    return col.graph.color;
  }

  const metricType = getMetricTypeFromColumn(col);
  if (metricType) {
    return FRAGMENT_GRAPH_COLORS[metricType] ?? '#888888';
  }

  return '#888888';
}

function getMetricTypeFromColumn(col: ColumnDef): MetricType | undefined {
  if (col.source.type === 'metric-type') {
    return col.source.metricType;
  }
  return undefined;
}

const FRAGMENT_GRAPH_COLORS: Record<string, string> = {
  [MetricType.Time]: '#3b82f6',      // blue
  [MetricType.Rep]: '#22c55e',        // green
  [MetricType.Effort]: '#eab308',     // yellow
  [MetricType.Distance]: '#14b8a6',   // teal
  [MetricType.Rounds]: '#a855f7',     // purple
  [MetricType.Resistance]: '#ef4444', // red
  [MetricType.Increment]: '#6366f1',  // indigo
  [MetricType.Action]: '#ec4899',     // pink
};

function getUnitForColumn(col: ColumnDef): string {
  if (col.graph?.unit) {
    return col.graph.unit;
  }

  const metricType = getMetricTypeFromColumn(col);
  if (!metricType) {
    return '';
  }

  switch (metricType) {
    case MetricType.Time:
      return 'ms';
    case MetricType.Rep:
      return 'reps';
    case MetricType.Distance:
      return 'm';
    case MetricType.Rounds:
      return 'rounds';
    case MetricType.Resistance:
      return 'kg';
    case MetricType.Increment:
      return 'Δ';
    default:
      return '';
  }
}
