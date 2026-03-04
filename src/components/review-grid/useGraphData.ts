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
import type { GridRow, GridColumn } from './types';
import { FIXED_COLUMN_IDS } from './types';

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
  columns: GridColumn[];
  /** IDs of columns tagged for graphing */
  graphTaggedColumnIds: string[];
  /** Currently selected row/segment IDs (for highlight) */
  selectedIds: Set<number>;
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
  const { rows, columns, graphTaggedColumnIds } = options;

  const graphConfigs = useMemo(
    () => buildGraphConfigs(graphTaggedColumnIds, columns),
    [graphTaggedColumnIds, columns],
  );

  const data = useMemo(
    () => buildDataPoints(rows, graphTaggedColumnIds, columns),
    [rows, graphTaggedColumnIds, columns],
  );

  const hasData = graphConfigs.length > 0 && data.length > 0;

  return { data, graphConfigs, hasData };
}

// ─── Graph Config Builder ──────────────────────────────────────

/**
 * Map each tagged column into an AnalyticsGraphConfig with an appropriate
 * color and label.
 */
function buildGraphConfigs(
  taggedIds: string[],
  columns: GridColumn[],
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

/**
 * Build one data point per row, extracting numeric values for each
 * tagged column.
 */
function buildDataPoints(
  rows: GridRow[],
  taggedIds: string[],
  columns: GridColumn[],
): GraphDataPoint[] {
  if (taggedIds.length === 0) return [];

  return rows.map((row) => {
    const point: GraphDataPoint = {
      index: row.index,
      label: row.sourceBlockKey,
    };

    for (const colId of taggedIds) {
      point[colId] = getNumericValue(row, colId, columns);
    }

    return point;
  });
}

/**
 * Extract a numeric value from a row for a given column.
 * Fixed columns return their scalar value; metrics columns return
 * the first numeric metric value (or 0).
 */
function getNumericValue(
  row: GridRow,
  columnId: string,
  columns: GridColumn[],
): number {
  // Fixed numeric columns
  switch (columnId) {
    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return row.elapsed;
    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return row.stackLevel;
    case FIXED_COLUMN_IDS.INDEX:
      return row.index;
  }

  // Fragment columns — find first numeric value
  const col = columns.find((c) => c.id === columnId);
  if (col?.metricType) {
    const cell = row.cells.get(col.metricType);
    if (cell) {
      for (const frag of cell.metrics) {
        if (typeof frag.value === 'number') return frag.value;
      }
    }
  }

  return 0;
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Assign a distinct color to each column based on its metrics type.
 */
function getColorForColumn(col: GridColumn): string {
  if (col.metricType) {
    return FRAGMENT_GRAPH_COLORS[col.metricType] ?? '#888888';
  }

  // Fixed columns
  switch (col.id) {
    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return '#14b8a6'; // teal
    default:
      return '#888888';
  }
}

/**
 * Hex colors for graph lines per metrics type.
 * These complement the Tailwind classes in metricColorMap.
 */
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

/**
 * Unit label for graph Y-axis.
 */
function getUnitForColumn(col: GridColumn): string {
  if (!col.metricType) {
    if (col.id === FIXED_COLUMN_IDS.ELAPSED_TOTAL) return 'ms';
    return '';
  }

  switch (col.metricType) {
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
