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
import { FragmentType } from '@/core/models/CodeFragment';
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
 * Fixed columns return their scalar value; fragment columns return
 * the first numeric fragment value (or 0).
 */
function getNumericValue(
  row: GridRow,
  columnId: string,
  columns: GridColumn[],
): number {
  // Fixed numeric columns
  switch (columnId) {
    case FIXED_COLUMN_IDS.ELAPSED:
      return row.elapsed;
    case FIXED_COLUMN_IDS.TOTAL:
      return row.total;
    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return row.stackLevel;
    case FIXED_COLUMN_IDS.INDEX:
      return row.index;
  }

  // Fragment columns — find first numeric value
  const col = columns.find((c) => c.id === columnId);
  if (col?.fragmentType) {
    const cell = row.cells.get(col.fragmentType);
    if (cell) {
      for (const frag of cell.fragments) {
        if (typeof frag.value === 'number') return frag.value;
      }
    }
  }

  return 0;
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Assign a distinct color to each column based on its fragment type.
 */
function getColorForColumn(col: GridColumn): string {
  if (col.fragmentType) {
    return FRAGMENT_GRAPH_COLORS[col.fragmentType] ?? '#888888';
  }

  // Fixed columns
  switch (col.id) {
    case FIXED_COLUMN_IDS.ELAPSED:
      return '#14b8a6'; // teal
    case FIXED_COLUMN_IDS.TOTAL:
      return '#0ea5e9'; // sky
    default:
      return '#888888';
  }
}

/**
 * Hex colors for graph lines per fragment type.
 * These complement the Tailwind classes in fragmentColorMap.
 */
const FRAGMENT_GRAPH_COLORS: Record<string, string> = {
  [FragmentType.Timer]: '#3b82f6',      // blue
  [FragmentType.Rep]: '#22c55e',        // green
  [FragmentType.Effort]: '#eab308',     // yellow
  [FragmentType.Distance]: '#14b8a6',   // teal
  [FragmentType.Rounds]: '#a855f7',     // purple
  [FragmentType.Resistance]: '#ef4444', // red
  [FragmentType.Increment]: '#6366f1',  // indigo
  [FragmentType.Action]: '#ec4899',     // pink
};

/**
 * Unit label for graph Y-axis.
 */
function getUnitForColumn(col: GridColumn): string {
  if (!col.fragmentType) {
    if (col.id === FIXED_COLUMN_IDS.ELAPSED || col.id === FIXED_COLUMN_IDS.TOTAL) return 'ms';
    return '';
  }

  switch (col.fragmentType) {
    case FragmentType.Timer:
      return 'ms';
    case FragmentType.Rep:
      return 'reps';
    case FragmentType.Distance:
      return 'm';
    case FragmentType.Rounds:
      return 'rounds';
    case FragmentType.Resistance:
      return 'kg';
    case FragmentType.Increment:
      return 'Δ';
    default:
      return '';
  }
}
