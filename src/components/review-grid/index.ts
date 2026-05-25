/**
 * Review Grid — Barrel Export
 */

export { ReviewGrid } from './ReviewGrid';
export type { ReviewGridProps } from './ReviewGrid';

export { ResultsView } from './ResultsView';
export type { ResultsViewProps } from './ResultsView';

export { MetricPill } from './MetricPill';
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

// ─── Legacy Presets (deprecated — use GRID_COLUMN_SET_CONFIG instead) ─

export {
  DEFAULT_PRESET,
  DEBUG_PRESET,
  STRENGTH_PRESET,
  ENDURANCE_PRESET,
  GRID_PRESETS,
  getPreset,
  buildAllColumns,
} from './gridPresets';

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
  ComputeContext,
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
  renderMetricCell,
  renderIndent,
} from './interpreters';

export type {
  UnifiedCellRendererProps,
} from './interpreters';

// ─── ColumnSet Module ────────────────────────────────────────────

export {
  ColumnSet,
} from './ColumnSet';

export type {
  ColumnSetContext,
} from './ColumnSet';

// ─── CDL Column Definitions (Phase 2.4) ─────────────────────────

export {
  ALL_COLUMN_DEFINITIONS,
  GRID_COLUMN_SET_CONFIG,
  CDL_PRESET_DEFAULT,
  CDL_PRESET_DEBUG,
  CDL_PRESET_STRENGTH,
  CDL_PRESET_ENDURANCE,
  indexColumn,
  timestampColumn,
  spansColumn,
  blockKeyColumn,
  outputTypeColumn,
  stackLevelColumn,
  elapsedTotalColumn,
  completionReasonColumn,
  exerciseColumn,
  effortColumn,
  durationColumn,
  paceColumn,
  repColumn,
  roundsColumn,
  distanceColumn,
  resistanceColumn,
  actionColumn,
  incrementColumn,
  metricColumn,
  groupColumn,
  systemColumn,
  labelColumn,
  textColumn,
  currentRoundColumn,
  volumeColumn,
  intensityColumn,
  loadFocusColumn,
  loadColumn,
  workColumn,
} from './cdlColumnDefinitions';
