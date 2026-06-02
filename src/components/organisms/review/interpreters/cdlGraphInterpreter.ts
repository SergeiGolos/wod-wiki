/**
 * CDL Graph Interpreter
 *
 * Extracts a numeric value from a GridRow using a ColumnDef's graph config.
 * Replaces the scattered numeric-extraction logic in the old graph pipeline.
 */

import type { GridRow } from './types';
import type { ColumnDef, ComputeContext } from './column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';

// ─── Public API ────────────────────────────────────────────────

/**
 * Extract a numeric value from a row for graphing/charting.
 *
 * @param row           The grid row
 * @param colDef        The column definition (must have graph config)
 * @param context       Optional derived-source context
 * @param definitionMap Map of column definitions for dependency resolution
 * @returns             Numeric value, or undefined if absent / non-numeric
 */
export function extractGraphValue(
  row: GridRow,
  colDef: ColumnDef,
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): number | undefined {
  if (!colDef.graph) {
    return undefined;
  }

  const raw = resolveColumnSource(row, colDef.source, context, definitionMap);
  return colDef.graph.extractor(raw);
}

/**
 * Build a graph data point for a set of column definitions.
 *
 * @param row           The grid row
 * @param colDefs       Column definitions that have graph configs
 * @param context       Optional derived-source context
 * @param definitionMap Map of column definitions for dependency resolution
 * @returns             Object keyed by column id → numeric value
 */
export function buildGraphDataPoint(
  row: GridRow,
  colDefs: ColumnDef[],
  context?: ComputeContext,
  definitionMap?: ReadonlyMap<string, ColumnDef>,
): Record<string, number | undefined> {
  const point: Record<string, number | undefined> = {};
  for (const colDef of colDefs) {
    if (colDef.graph) {
      point[colDef.id] = extractGraphValue(row, colDef, context, definitionMap);
    }
  }
  return point;
}
