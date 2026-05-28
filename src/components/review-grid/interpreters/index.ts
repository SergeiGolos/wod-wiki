/**
 * CDL Core Interpreters
 *
 * Sort, Graph, Filter, Fallback Chain, and Cell Render interpreters for the Column Definition Language.
 * These replace the scattered switch statements across useGridData.ts and useGraphData.ts
 * and the legacy fixed-cell and metric-cell renderers in the old grid implementation.
 */

export {
  resolveColumnSource,
} from './cdlSourceResolver';

export {
  interpretFallbackChain,
} from './cdlFallbackInterpreter';

export type {
  // No additional types exported from fallback interpreter
} from './cdlFallbackInterpreter';

export type {
  // No additional types exported from resolver
} from './cdlSourceResolver';

export {
  extractSortValue,
  compareSortValues,
  compareRowsByColumn,
  extractCombinedSortValue,
} from './cdlSortInterpreter';

export {
  extractGraphValue,
  buildGraphDataPoint,
} from './cdlGraphInterpreter';

export {
  extractFilterText,
  matchColumnFilter,
  matchGlobalSearch,
  extractCombinedFilterText,
} from './cdlFilterInterpreter';

export {
  UnifiedCellRenderer,
  renderMetricCell,
  renderIndent,
} from './cdlCellRenderer';

export type {
  UnifiedCellRendererProps,
} from './cdlCellRenderer';
