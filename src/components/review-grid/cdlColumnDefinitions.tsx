/**
 * CDL Column Definitions
 *
 * Canonical ColumnDef declarations for every column in the review grid.
 * Replaces the imperative GridColumn building in gridPresets.ts and the
 * runtime inference in inferColumnDefFromGridColumn().
 *
 * @see docs/adr/0011-column-definition-language.md
 */

import { MetricType } from '@/core/models/Metric';
import { formatSecondsMMSS, formatSecondsHHMMSS } from '@/lib/formatTime';
import { getMetricIcon } from '@/views/runtime/metricColorMap';
import { computeColumnLabel } from '@/core/metrics/presentation';
import type { ColumnDef, ColumnSetConfig, ColumnSetPreset } from './column-definition-language';
import { renderMetricCell } from './interpreters';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Metric Cell Extractor Helpers
// ═══════════════════════════════════════════════════════════════

function getMetricArray(cell: unknown): any[] {
  const c = cell as any;
  if (!c?.metrics) return [];
  return c.metrics.toArray?.() ?? c.metrics ?? [];
}

function extractMetricSortValue(cell: unknown): number | string | undefined {
  const arr = getMetricArray(cell);
  if (arr.length === 0) return undefined;
  const first = arr[0];
  if (typeof first?.value === 'number') return first.value;
  if (first?.image) return first.image;
  return String(first?.value ?? '');
}

function extractMetricGraphValue(cell: unknown): number | undefined {
  const arr = getMetricArray(cell);
  for (const m of arr) {
    if (typeof m?.value === 'number') return m.value;
  }
  return undefined;
}

function extractMetricFilterText(cell: unknown): string {
  const arr = getMetricArray(cell);
  return arr.map((m: any) => m.image ?? String(m.value ?? '')).join(', ');
}

function isNumericMetricType(ft: MetricType): boolean {
  switch (ft) {
    case MetricType.Duration:
    case MetricType.Rep:
    case MetricType.Distance:
    case MetricType.Rounds:
    case MetricType.Resistance:
    case MetricType.Increment:
    case MetricType.Metric:
    case MetricType.Volume:
    case MetricType.Intensity:
    case MetricType.Load:
    case MetricType.Work:
    case MetricType.CurrentRound:
      return true;
    default:
      return false;
  }
}

function getUnitForMetricType(ft: MetricType): string {
  switch (ft) {
    case MetricType.Duration:
      return 's';
    case MetricType.Rep:
      return 'reps';
    case MetricType.Distance:
      return 'm';
    case MetricType.Rounds:
      return 'rounds';
    case MetricType.Resistance:
      return 'kg';
    case MetricType.Increment:
      return 'Δ';
    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════════
// Metric Column Factory
// ═══════════════════════════════════════════════════════════════

function makeMetricColumn(
  metricType: MetricType,
  opts?: { defaultVisible?: boolean; graphable?: boolean },
): ColumnDef {
  const label = computeColumnLabel(metricType);
  const icon = getMetricIcon(metricType) ?? undefined;
  const graphable = opts?.graphable ?? isNumericMetricType(metricType);

  return {
    id: metricType,
    label,
    icon,
    source: { type: 'metric-type', metricType },
    format: {
      type: 'custom',
      render: (value) => renderMetricCell(value, 0),
    },
    sort: {
      type: isNumericMetricType(metricType) ? 'numeric' : 'text',
      extractor: (cell) => extractMetricSortValue(cell),
    },
    graph: graphable
      ? {
          extractor: (cell) => extractMetricGraphValue(cell),
          axisLabel: label,
          unit: getUnitForMetricType(metricType),
        }
      : undefined,
    filter: {
      extractor: (cell) => extractMetricFilterText(cell),
      caseInsensitive: true,
    },
    meta: {
      defaultVisible: opts?.defaultVisible ?? true,
      tags: [metricType],
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Fixed Columns
// ═══════════════════════════════════════════════════════════════

function outputTypeBadgeClass(type: string): string {
  switch (type) {
    case 'segment':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'milestone':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
    case 'system':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'event':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
    case 'group':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200';
    case 'load':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    case 'compiler':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

function formatSpans(
  spans?: { started: number; ended?: number }[],
  durationSeconds?: number,
): string {
  if (!spans || spans.length === 0) return '';
  const fmt = (s: number) => formatSecondsMMSS(s);
  if (durationSeconds === 0) {
    return fmt(spans[0].started);
  }
  const start = fmt(spans[0].started);
  const endSpan = spans[spans.length - 1];
  if (endSpan.ended === undefined) return start;
  const end = fmt(endSpan.ended);
  if (start === end) return start;
  return `${start} — ${end}`;
}

function formatTimestamp(ts?: number, withMs: boolean = true): string {
  if (ts === undefined || ts === 0) return '';
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  if (!withMs) return `${h}:${m}:${s}`;
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/** Index (#) column */
export const indexColumn: ColumnDef = {
  id: '#',
  label: '#',
  source: {
    type: 'derived',
    compute: (row) => ({
      index: row.index,
      outputType: row.outputType,
      sourceBlockKey: row.sourceBlockKey,
    }),
  },
  format: {
    type: 'custom',
    render: (value) => {
      const { index, outputType, sourceBlockKey } = (value as {
        index: number;
        outputType: string;
        sourceBlockKey: string;
      }) ?? {};
      return (
        <span
          className={cn(
            'font-mono text-[11px] w-8 text-right inline-block',
            outputTypeBadgeClass(outputType),
          )}
          title={`Type: ${outputType}\nBlock: ${sourceBlockKey}`}
        >
          {index}
        </span>
      );
    },
  },
  sort: {
    type: 'numeric',
    extractor: (row) => (row as any)?.index || 0,
  },
  meta: {
    tags: ['layout'],
    defaultVisible: true,
    width: '40px',
    resizable: false,
  },
};

/** Timestamp column */
export const timestampColumn: ColumnDef = {
  id: 'timestamp',
  label: 'Timestamp',
  source: { type: 'fixed-field', field: 'absoluteStartTime' },
  format: {
    type: 'custom',
    render: (value, ctx) => {
      const ts = value as number | undefined;
      const withMs = (ctx as any)?.hideMs !== false;
      return (
        <span className="text-muted-foreground font-mono text-[10px] text-center w-24 whitespace-nowrap">
          {formatTimestamp(ts, withMs)}
        </span>
      );
    },
    context: { hideMs: false },
  },
  sort: {
    type: 'numeric',
    extractor: (row) => (row as any)?.absoluteStartTime ?? 0,
  },
  meta: {
    tags: ['timing', 'layout'],
    defaultVisible: true,
  },
};

/** Spans (Time) column */
export const spansColumn: ColumnDef = {
  id: 'spans',
  label: 'Time',
  source: {
    type: 'derived',
    compute: (row) => ({ spans: row.spans, duration: row.duration }),
  },
  format: {
    type: 'custom',
    render: (value) => {
      const { spans, duration } = (value as {
        spans: { started: number; ended?: number }[];
        duration?: number;
      }) ?? {};
      return (
        <span className="text-muted-foreground font-mono text-[10px] text-center w-40 whitespace-nowrap">
          {formatSpans(spans, duration)}
        </span>
      );
    },
  },
  sort: {
    type: 'numeric',
    extractor: (row) => {
      const spans = (row as any)?.spans;
      return spans?.[0]?.started ?? 0;
    },
  },
  meta: {
    tags: ['timing', 'layout'],
    defaultVisible: true,
  },
};

/** Block key column */
export const blockKeyColumn: ColumnDef = {
  id: 'blockKey',
  label: 'Block',
  source: { type: 'fixed-field', field: 'sourceBlockKey' },
  format: {
    type: 'text',
    className: 'truncate max-w-[160px] text-sm',
  },
  sort: {
    type: 'text',
    extractor: (row) => (row as any)?.sourceBlockKey ?? '',
  },
  filter: {
    extractor: (row) => (row as any)?.sourceBlockKey ?? '',
    caseInsensitive: true,
  },
  meta: {
    tags: ['layout'],
    defaultVisible: false,
  },
};

/** Output type column */
export const outputTypeColumn: ColumnDef = {
  id: 'outputType',
  label: 'Type',
  source: { type: 'fixed-field', field: 'outputType' },
  format: {
    type: 'custom',
    render: (value) => {
      const type = String(value ?? '');
      return (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded font-medium',
            outputTypeBadgeClass(type),
          )}
        >
          {type}
        </span>
      );
    },
  },
  sort: {
    type: 'text',
    extractor: (row) => (row as any)?.outputType ?? '',
  },
  filter: {
    extractor: (row) => (row as any)?.outputType ?? '',
    caseInsensitive: true,
  },
  meta: {
    tags: ['debug'],
    defaultVisible: false,
  },
};

/** Stack level column */
export const stackLevelColumn: ColumnDef = {
  id: 'stackLevel',
  label: 'Depth',
  source: { type: 'fixed-field', field: 'stackLevel' },
  format: {
    type: 'text',
    className: 'text-muted-foreground font-mono text-xs text-center w-12',
  },
  sort: {
    type: 'numeric',
    extractor: (row) => (row as any)?.stackLevel ?? 0,
  },
  meta: {
    tags: ['debug'],
    defaultVisible: false,
    debugOnly: true,
  },
};

/** Elapsed / Total column */
export const elapsedTotalColumn: ColumnDef = {
  id: 'elapsedTotal',
  label: 'Elapsed',
  source: {
    type: 'derived',
    compute: (row) => ({ elapsed: row.elapsed, total: row.total }),
  },
  format: {
    type: 'custom',
    render: (value) => {
      const { elapsed, total } = (value as { elapsed: number; total: number }) ?? {};
      if (elapsed === undefined || total === undefined) return '';
      const text =
        elapsed === total
          ? formatSecondsMMSS(elapsed)
          : `${formatSecondsMMSS(elapsed)} / ${formatSecondsMMSS(total)}`;
      return (
        <span className="text-foreground font-mono text-xs text-right w-32 whitespace-nowrap">
          {text}
        </span>
      );
    },
  },
  sort: {
    type: 'numeric',
    extractor: (row) => (row as any)?.elapsed ?? 0,
  },
  graph: {
    extractor: (row) => (row as any)?.elapsed,
    axisLabel: 'Elapsed',
    unit: 's',
  },
  meta: {
    tags: ['timing'],
    defaultVisible: true,
  },
};

/** Completion reason column */
export const completionReasonColumn: ColumnDef = {
  id: 'completionReason',
  label: 'Reason',
  source: { type: 'fixed-field', field: 'completionReason' },
  format: {
    type: 'text',
    className: 'text-muted-foreground text-xs truncate max-w-[120px]',
  },
  sort: {
    type: 'text',
    extractor: (row) => (row as any)?.completionReason ?? '',
  },
  filter: {
    extractor: (row) => (row as any)?.completionReason ?? '',
    caseInsensitive: true,
  },
  meta: {
    tags: ['debug'],
    defaultVisible: false,
    debugOnly: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// Metric-Type Columns
// ═══════════════════════════════════════════════════════════════

export const effortColumn = makeMetricColumn(MetricType.Effort);
export const durationColumn = makeMetricColumn(MetricType.Duration);
export const repColumn = makeMetricColumn(MetricType.Rep);
export const roundsColumn = makeMetricColumn(MetricType.Rounds);
export const distanceColumn = makeMetricColumn(MetricType.Distance);
export const resistanceColumn = makeMetricColumn(MetricType.Resistance);
export const actionColumn = makeMetricColumn(MetricType.Action);
export const incrementColumn = makeMetricColumn(MetricType.Increment);
export const metricColumn = makeMetricColumn(MetricType.Metric);
export const groupColumn = makeMetricColumn(MetricType.Group, { defaultVisible: false });
export const systemColumn = makeMetricColumn(MetricType.System, { defaultVisible: false });
export const labelColumn = makeMetricColumn(MetricType.Label);
export const textColumn = makeMetricColumn(MetricType.Text);
export const currentRoundColumn = makeMetricColumn(MetricType.CurrentRound);
export const volumeColumn = makeMetricColumn(MetricType.Volume);
export const intensityColumn = makeMetricColumn(MetricType.Intensity);
export const loadColumn = makeMetricColumn(MetricType.Load);
export const workColumn = makeMetricColumn(MetricType.Work);

// ═══════════════════════════════════════════════════════════════
// Column Set Config
// ═══════════════════════════════════════════════════════════════

/** All column definitions in canonical order. */
export const ALL_COLUMN_DEFINITIONS: ColumnDef[] = [
  // Layout / fixed columns
  indexColumn,
  timestampColumn,
  spansColumn,
  blockKeyColumn,
  outputTypeColumn,
  stackLevelColumn,
  elapsedTotalColumn,
  completionReasonColumn,
  // Primary descriptors
  effortColumn,
  textColumn,
  labelColumn,
  // Data metrics
  durationColumn,
  repColumn,
  roundsColumn,
  distanceColumn,
  resistanceColumn,
  actionColumn,
  incrementColumn,
  metricColumn,
  currentRoundColumn,
  volumeColumn,
  intensityColumn,
  loadColumn,
  workColumn,
  // System / meta
  groupColumn,
  systemColumn,
];

/** Default preset — normal user view. */
export const CDL_PRESET_DEFAULT: ColumnSetPreset = {
  label: 'Default',
  visibleColumnIds: [
    '#',
    'timestamp',
    'spans',
    'effort',
    'text',
    'label',
    'duration',
    'rep',
    'rounds',
    'distance',
    'resistance',
    'action',
    'increment',
    'metric',
    'current-round',
    'volume',
    'intensity',
    'load',
    'work',
    'elapsedTotal',
  ],
};

/** Debug preset — shows everything including system events. */
export const CDL_PRESET_DEBUG: ColumnSetPreset = {
  label: 'Debug',
  visibleColumnIds: [
    '#',
    'timestamp',
    'spans',
    'blockKey',
    'outputType',
    'stackLevel',
    'effort',
    'text',
    'label',
    'duration',
    'rep',
    'rounds',
    'distance',
    'resistance',
    'action',
    'increment',
    'metric',
    'current-round',
    'volume',
    'intensity',
    'load',
    'work',
    'group',
    'system',
    'elapsedTotal',
    'completionReason',
  ],
};

/** The canonical ColumnSetConfig used by useGridData. */
export const GRID_COLUMN_SET_CONFIG: ColumnSetConfig = {
  definitions: ALL_COLUMN_DEFINITIONS,
  presets: {
    default: CDL_PRESET_DEFAULT,
    debug: CDL_PRESET_DEBUG,
  },
  defaultPreset: 'default',
};
