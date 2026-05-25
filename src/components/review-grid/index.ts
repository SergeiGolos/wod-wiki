/**
 * Review Grid — Barrel Export
 */

export { ReviewGrid } from './ReviewGrid';
export type { ReviewGridProps } from './ReviewGrid';

export { ResultsView } from './ResultsView';
export type { ResultsViewProps } from './ResultsView';

export { MetricPill } from './MetricPill';
export { GridCell } from './GridCell';
export { GridRow } from './GridRow';
export { GridHeader } from './GridHeader';
export { GridToolbar } from './GridToolbar';
export { GridGraphPanel } from './GridGraphPanel';

export { useGridData } from './useGridData';
export type { UseGridDataOptions, UseGridDataReturn } from './useGridData';

export { useGraphData } from './useGraphData';
export type { UseGraphDataOptions, UseGraphDataReturn, GraphDataPoint } from './useGraphData';

export { useUserOverrides } from './useUserOverrides';
export { UserOverrideDialog } from './UserOverrideDialog';

export { DEFAULT_PRESET, DEBUG_PRESET, GRID_PRESETS, getPreset, buildAllColumns } from './gridPresets';

export type {
  GridRow as GridRowData,
  GridCell as GridCellData,
  GridColumn,
  GridSortConfig,
  GridFilterConfig,
  GridViewPreset,
} from './types';
export { FIXED_COLUMN_IDS } from './types';

// ─── CDL (Column Definition Language) ────────────────────────────

export type {
  ColumnDef,
  ColumnSource,
  ColumnFormat,
  ColumnSortConfig,
  ColumnGraphConfig,
  ColumnFilterConfig,
  ColumnMetadata,
  ColumnSetConfig,
  ColumnSetPreset,
  FixedFieldSource,
  MetricTypeSource,
  DerivedSource,
  FallbackSource,
  DerivedSourceContext,
} from './column-definition-language';

export {
  resolveColumnSource,
} from './interpreters';

export {
  extractSortValue,
  compareSortValues,
  compareRowsByColumn,
} from './interpreters';

export {
  extractGraphValue,
  buildGraphDataPoint,
} from './interpreters';

export {
  extractFilterText,
  matchColumnFilter,
  matchGlobalSearch,
} from './interpreters';

export {
  UnifiedCellRenderer,
  inferColumnDefFromGridColumn,
} from './interpreters';

export type {
  UnifiedCellRendererProps,
} from './interpreters';
