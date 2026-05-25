/**
 * CDL Core Interpreters
 *
 * Sort, Graph, Filter, and Cell Render interpreters for the Column Definition Language.
 * These replace the scattered switch statements across useGridData.ts and useGraphData.ts
 * and the renderFixedCell/GridCell components in GridRow.tsx.
 */

export {
  resolveColumnSource,
} from './cdlSourceResolver';

export type {
  // No additional types exported from resolver
} from './cdlSourceResolver';

export {
  extractSortValue,
  compareSortValues,
  compareRowsByColumn,
} from './cdlSortInterpreter';

export {
  extractGraphValue,
  buildGraphDataPoint,
} from './cdlGraphInterpreter';

export {
  extractFilterText,
  matchColumnFilter,
  matchGlobalSearch,
} from './cdlFilterInterpreter';

export {
  UnifiedCellRenderer,
  inferColumnDefFromGridColumn,
  renderMetricCell,
  renderIndent,
} from './cdlCellRenderer';

export type {
  UnifiedCellRendererProps,
} from './cdlCellRenderer';
