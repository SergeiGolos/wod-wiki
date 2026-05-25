/**
 * CDL Graph Interpreter
 *
 * Extracts a numeric value from a GridRow using a ColumnDef's graph config.
 * Replaces the scattered switch statements in useGraphData.ts (getNumericValue).
 */

import type { GridRow } from '../types';
import type { ColumnDef, DerivedSourceContext } from '../column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';

// ─── Public API ────────────────────────────────────────────────

/**
 * Extract a numeric value from a row for graphing/charting.
 *
 * @param row      The grid row
 * @param colDef   The column definition (must have graph config)
 * @param context  Optional derived-source context
 * @returns        Numeric value, or undefined if absent / non-numeric
 */
export function extractGraphValue(
  row: GridRow,
  colDef: ColumnDef,
  context?: DerivedSourceContext,
): number | undefined {
  if (!colDef.graph) {
    return undefined;
  }

  const raw = resolveColumnSource(row, colDef.source, context);
  return colDef.graph.extractor(raw);
}

/**
 * Build a graph data point for a set of column definitions.
 *
 * @param row      The grid row
 * @param colDefs  Column definitions that have graph configs
 * @param context  Optional derived-source context
 * @returns        Object keyed by column id → numeric value
 */
export function buildGraphDataPoint(
  row: GridRow,
  colDefs: ColumnDef[],
  context?: DerivedSourceContext,
): Record<string, number | undefined> {
  const point: Record<string, number | undefined> = {};
  for (const colDef of colDefs) {
    if (colDef.graph) {
      point[colDef.id] = extractGraphValue(row, colDef, context);
    }
  }
  return point;
}
