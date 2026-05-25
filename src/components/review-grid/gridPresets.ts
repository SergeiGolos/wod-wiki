/**
 * Review Grid — Preset Compatibility Wrapper
 *
 * Legacy preset helpers now proxy to the CDL ColumnSet config so the toolbar
 * and older exports stay aligned with the canonical preset definitions.
 */

import { MetricType } from '@/core/models/Metric';
import type { GridViewPreset, GridColumn } from './types';
import { GRID_COLUMN_SET_CONFIG } from './cdlColumnDefinitions';
import type { ColumnDef, ColumnSetPreset } from './column-definition-language';

function toLegacyPreset(id: string, preset: ColumnSetPreset): GridViewPreset {
  return {
    id,
    label: preset.label,
    filters: preset.filters ?? {},
    visibleColumns: [...preset.visibleColumnIds],
    isDefault: id === GRID_COLUMN_SET_CONFIG.defaultPreset,
  };
}

function toLegacyGridColumn(
  def: ColumnDef,
  preset: GridViewPreset,
  isDebugMode: boolean,
): GridColumn {
  return {
    id: def.id,
    type: def.source.type === 'metric-type' ? def.source.metricType : undefined,
    label: def.label,
    icon: def.icon,
    sortable: def.sort !== undefined,
    filterable: def.filter !== undefined,
    graphable: def.graph !== undefined,
    isGraphed: false,
    visible:
      preset.visibleColumns.includes(def.id) &&
      (!def.meta?.debugOnly || isDebugMode),
    meta: def.meta,
  };
}

/** All simple metric-type columns retained for legacy call sites. */
export const ALL_FRAGMENT_COLUMNS: MetricType[] = GRID_COLUMN_SET_CONFIG.definitions
  .flatMap((def) => (def.source.type === 'metric-type' ? [def.source.metricType] : []));

/** All presets indexed by id, backed by CDL definitions. */
export const GRID_PRESETS: Record<string, GridViewPreset> = Object.fromEntries(
  Object.entries(GRID_COLUMN_SET_CONFIG.presets).map(([id, preset]) => [id, toLegacyPreset(id, preset)]),
);

export const DEFAULT_PRESET = GRID_PRESETS.default;
export const DEBUG_PRESET = GRID_PRESETS.debug;
export const STRENGTH_PRESET = GRID_PRESETS.strength;
export const ENDURANCE_PRESET = GRID_PRESETS.endurance;

/** Look up a preset by id, falling back to default. */
export function getPreset(id: string): GridViewPreset {
  return GRID_PRESETS[id] ?? DEFAULT_PRESET;
}

/**
 * Legacy metric-column builder. Prefer ColumnSet + GRID_COLUMN_SET_CONFIG.
 */
export function buildFragmentColumns(preset: GridViewPreset): GridColumn[] {
  return GRID_COLUMN_SET_CONFIG.definitions
    .filter((def) => def.source.type === 'metric-type')
    .map((def) => toLegacyGridColumn(def, preset, preset.id === 'debug'));
}

/**
 * Legacy all-column builder. Prefer ColumnSet + GRID_COLUMN_SET_CONFIG.
 */
export function buildAllColumns(preset: GridViewPreset, isDebugMode: boolean): GridColumn[] {
  return GRID_COLUMN_SET_CONFIG.definitions.map((def) =>
    toLegacyGridColumn(def, preset, isDebugMode),
  );
}
