/**
 * CDL Sort Interpreter
 *
 * Extracts a comparable value from a GridRow using a ColumnDef's sort config.
 * Replaces the scattered switch statements in useGridData.ts (getSortValue).
 */

import type { GridRow } from '../types';
import type { ColumnDef, DerivedSourceContext } from '../column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';

// ─── Public API ────────────────────────────────────────────────

/**
 * Extract a sortable value (string or number) from a row for the given column.
 *
 * @param row      The grid row
 * @param colDef   The column definition (must have sort config)
 * @param context  Optional derived-source context
 * @returns        Comparable value, or empty string if undefined
 */
export function extractSortValue(
  row: GridRow,
  colDef: ColumnDef,
  context?: DerivedSourceContext,
): string | number {
  if (!colDef.sort) {
    return '';
  }

  const raw = resolveColumnSource(row, colDef.source, context);
  const value = colDef.sort.extractor(raw);

  if (value === undefined || value === null) {
    return '';
  }

  return value;
}

/**
 * Compare two sort-extracted values.
 *
 * @param a  First value
 * @param b  Second value
 * @returns  -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a - b;
  }

  const strA = String(a ?? '');
  const strB = String(b ?? '');

  // Attempt numeric comparison for numeric strings
  const numA = parseFloat(strA);
  const numB = parseFloat(strB);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && strA === String(numA) && strB === String(numB)) {
    return numA - numB;
  }

  return strA.localeCompare(strB);
}

/**
 * High-level comparator for two rows given a ColumnDef.
 *
 * @param rowA     First row
 * @param rowB     Second row
 * @param colDef   Column definition with sort config
 * @param direction 'asc' or 'desc'
 * @param context  Optional derived-source context
 * @returns        Comparison result (-1, 0, 1)
 */
export function compareRowsByColumn(
  rowA: GridRow,
  rowB: GridRow,
  colDef: ColumnDef,
  direction: 'asc' | 'desc',
  context?: DerivedSourceContext,
): number {
  const valA = extractSortValue(rowA, colDef, context);
  const valB = extractSortValue(rowB, colDef, context);
  const cmp = compareSortValues(valA, valB);
  return direction === 'asc' ? cmp : -cmp;
}
