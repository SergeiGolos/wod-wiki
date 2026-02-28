/**
 * Review Grid — View Presets
 *
 * Pre-populated filter configurations for default and debug views.
 * The active preset is driven by the workbench debug toggle.
 */

import { FragmentType } from '@/core/models/CodeFragment';
import type { GridViewPreset, GridColumn } from './types';
import { FIXED_COLUMN_IDS } from './types';
import { getFragmentIcon } from '@/views/runtime/fragmentColorMap';

// ─── Preset Definitions ───────────────────────────────────────

/**
 * All available fragment-type columns.
 * Order here determines default column order in the grid.
 *
 * NOTE: Elapsed, Total, Duration, and Spans are EXCLUDED here because
 * they are handled as FIXED_COLUMNS with special rendering and ordering.
 */
export const ALL_FRAGMENT_COLUMNS: FragmentType[] = [
  FragmentType.Effort,
  FragmentType.Rep,
  FragmentType.Rounds,
  FragmentType.Distance,
  FragmentType.Resistance,
  FragmentType.Action,
  FragmentType.Increment,
  FragmentType.Group,
  FragmentType.Text,
  FragmentType.Sound,
  FragmentType.Label,
  FragmentType.CurrentRound,
  FragmentType.System,
];

/**
 * Fragment columns shown in the default (non-debug) view.
 * Excludes System, Sound, Group which are typically noise.
 */
const DEFAULT_VISIBLE_COLUMNS: FragmentType[] = [
  FragmentType.Effort,
  FragmentType.Rep,
  FragmentType.Rounds,
  FragmentType.Distance,
  FragmentType.Resistance,
  FragmentType.Action,
  FragmentType.Increment,
  FragmentType.Text,
];

/**
 * Default preset — normal user view.
 * Hides milestone, label, event, and system output types.
 */
export const DEFAULT_PRESET: GridViewPreset = {
  id: 'default',
  label: 'Default',
  filters: {
    outputTypes: ['segment', 'milestone', 'group'],
  },
  visibleColumns: DEFAULT_VISIBLE_COLUMNS,
  isDefault: true,
};

/**
 * Debug preset — shows everything including system events.
 * Activated automatically when the workbench debug toggle is on.
 */
export const DEBUG_PRESET: GridViewPreset = {
  id: 'debug',
  label: 'Debug',
  filters: {
    // No output type filter — show everything
  },
  visibleColumns: ALL_FRAGMENT_COLUMNS,
};

/** All presets indexed by id */
export const GRID_PRESETS: Record<string, GridViewPreset> = {
  [DEFAULT_PRESET.id]: DEFAULT_PRESET,
  [DEBUG_PRESET.id]: DEBUG_PRESET,
};

/**
 * Look up a preset by id, falling back to default.
 */
export function getPreset(id: string): GridViewPreset {
  return GRID_PRESETS[id] ?? DEFAULT_PRESET;
}

// ─── Column Definitions ───────────────────────────────────────

/**
 * Fixed (always-present) column definitions.
 */
export const FIXED_COLUMNS: GridColumn[] = [
  {
    id: FIXED_COLUMN_IDS.TIMESTAMP,
    label: 'Timestamp',  // TimeStamp: system Date.now() when logged
    sortable: true,
    filterable: false,
    graphable: false,
    isGraphed: false,
    visible: true,
    fragmentType: FragmentType.SystemTime,
  },
  {
    id: FIXED_COLUMN_IDS.SPANS,
    label: 'Time',  // Time: session-relative span ranges (:00 → 2:30)
    sortable: true,
    filterable: false,
    graphable: false,
    isGraphed: false,
    visible: true,
    fragmentType: FragmentType.Spans,
  },
  {
    id: FIXED_COLUMN_IDS.INDEX,
    label: '#',
    sortable: true,
    filterable: false,
    graphable: false,
    isGraphed: false,
    visible: true,
  },
  {
    id: FIXED_COLUMN_IDS.BLOCK_KEY,
    label: 'Block',
    sortable: true,
    filterable: true,
    graphable: false,
    isGraphed: false,
    visible: false,
  },
  {
    id: FIXED_COLUMN_IDS.OUTPUT_TYPE,
    label: 'Type',
    sortable: true,
    filterable: true,
    graphable: false,
    isGraphed: false,
    visible: false,
  },
  {
    id: FIXED_COLUMN_IDS.STACK_LEVEL,
    label: 'Depth',
    sortable: true,
    filterable: false,
    graphable: false,
    isGraphed: false,
    visible: false, // hidden by default, visible in debug
  },
  {
    id: FIXED_COLUMN_IDS.ELAPSED,
    label: 'Elapsed',  // Elapsed: Σ(end − start) active time only
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
    fragmentType: FragmentType.Elapsed,
  },
  {
    id: FIXED_COLUMN_IDS.DURATION,
    label: 'Duration',  // Duration: parser-defined planned target
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
    fragmentType: FragmentType.Duration,
  },

  {
    id: FIXED_COLUMN_IDS.TOTAL,
    label: 'Total',  // Total: wall-clock bracket including pauses
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
    fragmentType: FragmentType.Total,
  },
  {
    id: FIXED_COLUMN_IDS.COMPLETION_REASON,
    label: 'Reason',
    sortable: true,
    filterable: true,
    graphable: false,
    isGraphed: false,
    visible: false, // debug-only
  },
];

/**
 * Build fragment-type column definitions for the given preset.
 */
export function buildFragmentColumns(preset: GridViewPreset): GridColumn[] {
  return ALL_FRAGMENT_COLUMNS.map((ft) => ({
    id: ft,
    fragmentType: ft,
    label: ft.charAt(0).toUpperCase() + ft.slice(1),
    icon: getFragmentIcon(ft) ?? undefined,
    sortable: true,
    filterable: true,
    graphable: isNumericFragmentType(ft),
    isGraphed: false,
    visible: preset.visibleColumns.includes(ft),
  }));
}

/**
 * Build the complete column set (fixed + fragment) for a preset.
 * In debug mode, the stackLevel and completionReason columns become visible.
 */
export function buildAllColumns(preset: GridViewPreset, isDebugMode: boolean): GridColumn[] {
  // Helpers to find columns by ID or Type
  const getFixed = (id: string) => FIXED_COLUMNS.find(c => c.id === id)!;
  const getFragmentCol = (type: FragmentType) => {
    return buildFragmentColumns(preset).find(c => c.fragmentType === type);
  }

  const fragmentCols = buildFragmentColumns(preset);

  // Define strict order based on mode
  const order: GridColumn[] = [];
  const addedIds = new Set<string>();

  const add = (col: GridColumn | undefined) => {
    if (!col || addedIds.has(col.id)) return;
    order.push(col);
    addedIds.add(col.id);
  };

  // 1. Index (#)
  add(getFixed(FIXED_COLUMN_IDS.INDEX));

  // 2. Timestamp
  const timestampCol = getFixed(FIXED_COLUMN_IDS.TIMESTAMP);
  add({
    ...timestampCol,
    visible: true,
    meta: { hideMs: !isDebugMode }
  });

  // 3. Time (Spans)
  add(getFixed(FIXED_COLUMN_IDS.SPANS));

  if (isDebugMode) {
    // 4. System Fragment (Debug Only)
    const sysCol = getFragmentCol(FragmentType.System);
    add(sysCol ? { ...sysCol, visible: true } : undefined);
  }

  // 3/5. Effort (Primary Descriptor) - ALWAYS next to timestamps
  add(getFragmentCol(FragmentType.Effort));

  // 4/6. Text (Secondary Descriptor)
  add(getFragmentCol(FragmentType.Text));

  // 5/7. All other Fragments (Data)
  // We want the workout data (Reps, Load, Dist) to appear before the meta-stats (Elapsed/Total)
  fragmentCols.forEach(col => add(col));

  // 6/8. Meta Stats (Elapsed, Total, Duration) - Moved to end "after a certain point"
  add(getFixed(FIXED_COLUMN_IDS.ELAPSED));
  add(getFixed(FIXED_COLUMN_IDS.TOTAL));
  add(getFixed(FIXED_COLUMN_IDS.DURATION));

  // 7/9. Debug extras
  if (isDebugMode) {
    add({ ...getFixed(FIXED_COLUMN_IDS.COMPLETION_REASON), visible: true });
  }

  return order;
}

/**
 * Whether a fragment type holds numeric values suitable for graphing.
 */
function isNumericFragmentType(ft: FragmentType): boolean {
  switch (ft) {
    case FragmentType.Spans:
    case FragmentType.Elapsed:
    case FragmentType.Duration:
    case FragmentType.Total:
    case FragmentType.Rep:
    case FragmentType.Distance:
    case FragmentType.Rounds:
    case FragmentType.Resistance:
    case FragmentType.Increment:
      return true;
    default:
      return false;
  }
}
