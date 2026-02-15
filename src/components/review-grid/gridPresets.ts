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
 */
export const ALL_FRAGMENT_COLUMNS: FragmentType[] = [
  FragmentType.Timer,
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
  FragmentType.System,
];

/**
 * Fragment columns shown in the default (non-debug) view.
 * Excludes System, Sound, Group which are typically noise.
 */
const DEFAULT_VISIBLE_COLUMNS: FragmentType[] = [
  FragmentType.Timer,
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
 * Hides milestone, label, and system output types.
 */
export const DEFAULT_PRESET: GridViewPreset = {
  id: 'default',
  label: 'Default',
  filters: {
    outputTypes: ['segment', 'completion', 'metric', 'milestone'],
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
    id: FIXED_COLUMN_IDS.INDEX,
    label: '#',
    sortable: true,
    filterable: false,
    graphable: false,
    isGraphed: false,
    visible: true,
  },
  {
    id: FIXED_COLUMN_IDS.SPANS,
    label: 'Spans',
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
    visible: true,
  },
  {
    id: FIXED_COLUMN_IDS.OUTPUT_TYPE,
    label: 'Type',
    sortable: true,
    filterable: true,
    graphable: false,
    isGraphed: false,
    visible: true,
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
    label: 'Elapsed',
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
  },
  {
    id: FIXED_COLUMN_IDS.DURATION,
    label: 'Duration',
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
  },
  {
    id: FIXED_COLUMN_IDS.TOTAL,
    label: 'Total',
    sortable: true,
    filterable: false,
    graphable: true,
    isGraphed: false,
    visible: true,
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
  const fixed = FIXED_COLUMNS.map((col) => {
    if (isDebugMode && (col.id === FIXED_COLUMN_IDS.STACK_LEVEL || col.id === FIXED_COLUMN_IDS.COMPLETION_REASON)) {
      return { ...col, visible: true };
    }
    return { ...col };
  });

  const fragment = buildFragmentColumns(preset);
  return [...fixed, ...fragment];
}

/**
 * Whether a fragment type holds numeric values suitable for graphing.
 */
function isNumericFragmentType(ft: FragmentType): boolean {
  switch (ft) {
    case FragmentType.Timer:
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
