/**
 * CDL Unified Cell Renderer
 *
 * Renders a single table cell from a ColumnDef + GridRow.
 * Replaces both renderFixedCell() and the GridCell component.
 *
 * Responsibilities:
 * - Resolve the column source via cdlSourceResolver
 * - Apply the declared ColumnFormat (text, time, number, badge, pill, combined, custom)
 * - Render metric-type cells as MetricPill stacks
 * - Handle double-click for override editing on metric columns
 * - Preserve indentation semantics for hierarchy columns (e.g. Effort)
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatSecondsMMSS, formatSecondsHHMMSS } from '@/lib/formatTime';
import { MetricType } from '@/core/models/Metric';
import type { GridRow, GridColumn } from '../types';
import type {
  ColumnDef,
  ColumnFormat,
  DerivedSourceContext,
  TextFormat,
  TimeFormat,
  NumberFormat,
  BadgeFormat,
  PillFormat,
  CombinedFormat,
  CustomFormat,
} from '../column-definition-language';
import { resolveColumnSource } from './cdlSourceResolver';
import { MetricPill } from '../MetricPill';

// ─── Public Props ──────────────────────────────────────────────

export interface UnifiedCellRendererProps {
  /** CDL column definition */
  columnDef: ColumnDef;
  /** Row data */
  row: GridRow;
  /** Indentation level (0-based) for visual hierarchy */
  indent?: number;
  /** Callback when a metric cell is double-clicked for override editing */
  onDoubleClick?: (blockKey: string, metricType: MetricType, anchorRect: DOMRect) => void;
  /** Optional additional CSS classes for the <td> */
  className?: string;
  /** Optional context for derived sources */
  context?: DerivedSourceContext;
}

// ─── Component ─────────────────────────────────────────────────

/**
 * Render a single table cell using a CDL ColumnDef.
 */
export const UnifiedCellRenderer: React.FC<UnifiedCellRendererProps> = ({
  columnDef,
  row,
  indent = 0,
  onDoubleClick,
  className,
  context,
}) => {
  const tdRef = useRef<HTMLTableCellElement>(null);

  const rawValue = useMemo(
    () => resolveColumnSource(row, columnDef.source, context),
    [row, columnDef.source, context],
  );

  const isMetricColumn = columnDef.source.type === 'metric-type';

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMetricColumn && onDoubleClick && tdRef.current) {
        const rect = tdRef.current.getBoundingClientRect();
        onDoubleClick(row.sourceBlockKey, columnDef.source.metricType, rect);
      }
    },
    [isMetricColumn, columnDef.source, row.sourceBlockKey, onDoubleClick],
  );

  const content = useMemo(
    () => renderFormattedValue(rawValue, columnDef.format, indent, row),
    [rawValue, columnDef.format, indent, row],
  );

  return (
    <td
      ref={tdRef}
      className={cn('py-1 px-2', isMetricColumn && 'cursor-cell', className)}
      onDoubleClick={handleDoubleClick}
    >
      {content}
    </td>
  );
};

// ─── Format Dispatcher ─────────────────────────────────────────

/**
 * Render a resolved value through its declared ColumnFormat.
 * Returns a ReactNode suitable for placement inside a <td>.
 */
function renderFormattedValue(
  value: unknown,
  format: ColumnFormat,
  indent: number,
  row?: GridRow,
): React.ReactNode {
  // Universal empty-state: undefined/null renders as dim dash
  if (value === undefined || value === null) {
    return (
      <span className="inline-flex items-center gap-1">
        {renderIndent(indent)}
        <span className="text-muted-foreground opacity-40">—</span>
      </span>
    );
  }

  switch (format.type) {
    case 'text':
      return renderText(value, format, indent);
    case 'time':
      return renderTime(value, format);
    case 'number':
      return renderNumber(value, format);
    case 'badge':
      return renderBadge(value, format);
    case 'pill':
      return renderPill(value, format);
    case 'combined':
      return renderCombined(value, format, indent);
    case 'custom':
      return renderCustom(value, format, row);
    default:
      return renderFallback(value, indent);
  }
}

// ─── Text Format ───────────────────────────────────────────────

function renderText(
  value: unknown,
  format: TextFormat,
  indent: number,
): React.ReactNode {
  const text = format.transform ? format.transform(value) : extractDisplayText(value);

  return (
    <span className={cn('inline-flex items-center gap-1', format.className)}>
      {renderIndent(indent)}
      {text}
    </span>
  );
}

// ─── Time Format ───────────────────────────────────────────────

function renderTime(value: unknown, format: TimeFormat): React.ReactNode {
  const seconds = extractNumericValue(value);
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return <span className="text-muted-foreground">—</span>;
  }

  let formatted: string;
  switch (format.style) {
    case 'long':
      formatted = formatSecondsHHMMSS(seconds);
      break;
    case 'precise':
      // precise on seconds: show with decimal
      formatted = `${seconds.toFixed(2)}s`;
      break;
    case 'short':
    default:
      formatted = formatSecondsMMSS(seconds);
      break;
  }

  if (format.transform) {
    formatted = format.transform(formatted);
  }

  return <span className="font-mono text-xs whitespace-nowrap">{formatted}</span>;
}

// ─── Number Format ─────────────────────────────────────────────

function renderNumber(value: unknown, format: NumberFormat): React.ReactNode {
  const num = extractNumericValue(value);
  if (num === undefined || num === null || !Number.isFinite(num)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const decimals = format.decimals ?? 0;
  const formatted = num.toFixed(decimals) + (format.unit ?? '');

  if (format.transform) {
    return <span>{format.transform(formatted)}</span>;
  }

  return <span>{formatted}</span>;
}

// ─── Badge Format ──────────────────────────────────────────────

function renderBadge(value: unknown, format: BadgeFormat): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const style = format.styleResolver(value);
  const text = format.textResolver(value);

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        style.className,
      )}
      title={style.title}
    >
      {style.icon && <span className="mr-0.5">{style.icon}</span>}
      {text}
    </span>
  );
}

// ─── Pill Format ───────────────────────────────────────────────

function renderPill(value: unknown, format: PillFormat): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const text = format.transform ? format.transform(value) : extractDisplayText(value);
  const bg = format.backgroundColor ?? 'bg-muted';
  const radius = format.borderRadius ?? 'rounded';

  return (
    <span className={cn('inline-block px-1.5 py-0.5 text-xs font-medium', bg, radius)}>
      {text}
    </span>
  );
}

// ─── Combined Format ───────────────────────────────────────────

function renderCombined(
  value: unknown,
  format: CombinedFormat,
  indent: number,
  row?: GridRow,
): React.ReactNode {
  // Combined format expects an array of values (from all-present-combined fallback)
  const values = Array.isArray(value) ? value : [value];

  const [primary, secondary, tertiary] = values;

  const primaryNode = primary !== undefined
    ? renderSubFormat(primary, format.primaryFormat ?? { type: 'text' }, row)
    : null;
  const secondaryNode = secondary !== undefined
    ? renderSubFormat(secondary, format.secondaryFormat ?? { type: 'text' }, row)
    : null;
  const tertiaryNode = tertiary !== undefined
    ? renderSubFormat(tertiary, format.tertiaryFormat ?? { type: 'text' }, row)
    : null;

  const isHorizontal = format.layout === 'horizontal';

  return (
    <div
      className={cn(
        'inline-flex',
        isHorizontal ? 'flex-row items-center gap-1' : 'flex-col',
        format.containerClassName,
      )}
    >
      {renderIndent(indent)}
      {primaryNode}
      {secondaryNode && (
        <>
          {isHorizontal && format.separator && (
            <span className="text-muted-foreground">{format.separator}</span>
          )}
          <span className={isHorizontal ? '' : 'text-muted-foreground text-[11px]'}>
            {secondaryNode}
          </span>
        </>
      )}
      {tertiaryNode && (
        <>
          {isHorizontal && format.separator && (
            <span className="text-muted-foreground">{format.separator}</span>
          )}
          <span className={isHorizontal ? '' : 'text-muted-foreground text-[11px]'}>
            {tertiaryNode}
          </span>
        </>
      )}
    </div>
  );
}

function renderSubFormat(value: unknown, format: ColumnFormat, row?: GridRow): React.ReactNode {
  return renderFormattedValue(value, format, 0, row);
}

// ─── Custom Format ─────────────────────────────────────────────

function renderCustom(value: unknown, format: CustomFormat, row?: GridRow): React.ReactNode {
  const mergedContext = row ? { ...format.context, row } : format.context;
  return format.render(value, mergedContext);
}

// ─── Fallback / Empty ──────────────────────────────────────────

function renderFallback(value: unknown, indent: number): React.ReactNode {
  if (value === undefined || value === null) {
    return (
      <span className="inline-flex items-center gap-1">
        {renderIndent(indent)}
        <span className="text-muted-foreground opacity-40">—</span>
      </span>
    );
  }

  // If it's a GridCell-like object with metrics, render as pills
  const cell = value as any;
  if (cell?.metrics) {
    return renderMetricCell(cell, indent);
  }

  return (
    <span className="inline-flex items-center gap-1">
      {renderIndent(indent)}
      {extractDisplayText(value)}
    </span>
  );
}

// ─── Metric Cell (GridCell → MetricPills) ──────────────────────

/**
 * Render a GridCell value as a stack of MetricPill components.
 * This replaces the old GridCell component.
 */
export function renderMetricCell(cell: any, indent: number): React.ReactNode {
  const metrics = cell.metrics;

  // Handle both MetricContainer and plain arrays
  const metricArray: any[] = Array.isArray(metrics)
    ? metrics
    : metrics?.toArray?.() ?? metrics ?? [];

  if (metricArray.length === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        {renderIndent(indent)}
        <span className="text-muted-foreground opacity-40">—</span>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {renderIndent(indent)}
      {metricArray.map((metric, idx) => (
        <MetricPill key={idx} metric={metric} />
      ))}
    </div>
  );
}

// ─── Indentation Spacer ────────────────────────────────────────

export function renderIndent(indent: number): React.ReactNode {
  if (indent <= 0) return null;
  return (
    <div
      className="flex-shrink-0 mr-1 border-l-2 border-muted h-4"
      style={{ width: `${indent * 1.25}rem`, marginLeft: '2px' }}
    />
  );
}

// ─── Value Extractors ──────────────────────────────────────────

/**
 * Extract a display string from an arbitrary resolved value.
 */
function extractDisplayText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);

  // GridCell-like object
  const v = value as any;
  if (v.metrics) {
    const arr = v.metrics.toArray?.() ?? v.metrics ?? [];
    if (arr.length > 0) {
      const first = arr[0];
      if (first?.image) return first.image;
      if (first?.value !== undefined) return String(first.value);
    }
  }

  return String(value);
}

/**
 * Extract a numeric value from an arbitrary resolved value.
 */
function extractNumericValue(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  // GridCell-like object
  const v = value as any;
  if (v?.metrics) {
    const arr = v.metrics.toArray?.() ?? v.metrics ?? [];
    if (arr.length > 0 && typeof arr[0]?.value === 'number') {
      return arr[0].value;
    }
  }

  return undefined;
}

// ─── GridColumn → ColumnDef Bridge ─────────────────────────────

import { FIXED_COLUMN_IDS } from '../types';

/**
 * Infer a CDL ColumnDef from the legacy GridColumn interface.
 * This is a compatibility bridge during Phase 2 migration.
 *
 * Fixed columns get custom renderers that replicate the existing
 * renderFixedCell() behavior. Metric columns get metric-type sources
 * with custom format (MetricPill rendering).
 */
export function inferColumnDefFromGridColumn(col: GridColumn): ColumnDef {
  // ── Fixed columns ───────────────────────────────────────────
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return {
        id: col.id,
        label: col.label,
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
            const { index, outputType, sourceBlockKey } = (value as { index: number; outputType: string; sourceBlockKey: string }) ?? {};
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
      };

    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return {
        id: col.id,
        label: col.label,
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: {
          type: 'text',
          className: 'truncate max-w-[160px] text-sm',
        },
      };

    case FIXED_COLUMN_IDS.OUTPUT_TYPE:
      return {
        id: col.id,
        label: col.label,
        source: { type: 'fixed-field', field: 'outputType' },
        format: {
          type: 'custom',
          render: (value) => {
            const type = String(value ?? '');
            return (
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', outputTypeBadgeClass(type))}>
                {type}
              </span>
            );
          },
        },
      };

    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return {
        id: col.id,
        label: col.label,
        source: { type: 'fixed-field', field: 'stackLevel' },
        format: {
          type: 'text',
          className: 'text-muted-foreground font-mono text-xs text-center w-12',
        },
      };

    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return {
        id: col.id,
        label: col.label,
        source: {
          type: 'derived',
          compute: (row) => ({ elapsed: row.elapsed, total: row.total }),
        },
        format: {
          type: 'custom',
          render: (value) => {
            const { elapsed, total } = (value as { elapsed: number; total: number }) ?? {};
            if (elapsed === undefined || total === undefined) return '';
            const text = elapsed === total
              ? formatSecondsMMSS(elapsed)
              : `${formatSecondsMMSS(elapsed)} / ${formatSecondsMMSS(total)}`;
            return <span className="text-foreground font-mono text-xs text-right w-32 whitespace-nowrap">{text}</span>;
          },
        },
      };

    case FIXED_COLUMN_IDS.SPANS:
      return {
        id: col.id,
        label: col.label,
        source: {
          type: 'derived',
          compute: (row) => ({ spans: row.spans, duration: row.duration }),
        },
        format: {
          type: 'custom',
          render: (value) => {
            const { spans, duration } = (value as { spans: { started: number; ended?: number }[]; duration?: number }) ?? {};
            return (
              <span className="text-muted-foreground font-mono text-[10px] text-center w-40 whitespace-nowrap">
                {formatSpans(spans, duration)}
              </span>
            );
          },
        },
      };

    case FIXED_COLUMN_IDS.TIMESTAMP:
      return {
        id: col.id,
        label: col.label,
        source: { type: 'fixed-field', field: 'absoluteStartTime' },
        format: {
          type: 'custom',
          render: (value, ctx) => {
            const ts = value as number | undefined;
            const withMs = (ctx as any)?.hideMs !== true;
            return (
              <span className="text-muted-foreground font-mono text-[10px] text-center w-24 whitespace-nowrap">
                {formatTimestamp(ts, withMs)}
              </span>
            );
          },
          context: { hideMs: !col.meta?.hideMs },
        },
      };

    case FIXED_COLUMN_IDS.COMPLETION_REASON:
      return {
        id: col.id,
        label: col.label,
        source: { type: 'fixed-field', field: 'completionReason' },
        format: {
          type: 'text',
          className: 'text-muted-foreground text-xs truncate max-w-[120px]',
        },
      };

    default:
      break;
  }

  // ── Metric-type columns ─────────────────────────────────────
  if (col.type) {
    return {
      id: col.id,
      label: col.label,
      source: { type: 'metric-type', metricType: col.type },
      format: {
        type: 'custom',
        render: (value) => renderMetricCell(value, 0),
      },
    };
  }

  // ── Unknown / fallback ──────────────────────────────────────
  return {
    id: col.id,
    label: col.label,
    source: { type: 'fixed-field', field: 'sourceBlockKey' },
    format: { type: 'text' },
  };
}

// ─── Bridge Helpers (copied from GridRow.tsx for independence) ─

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

  const format = (s: number) => formatSecondsMMSS(s);

  if (durationSeconds === 0) {
    return format(spans[0].started);
  }

  const start = format(spans[0].started);
  const endSpan = spans[spans.length - 1];

  if (endSpan.ended === undefined) {
    return start;
  }

  const end = format(endSpan.ended);
  if (start === end) return start;
  return `${start} — ${end}`;
}

function formatTimestamp(timestampMs?: number, withMs: boolean = true): string {
  if (timestampMs === undefined || timestampMs === 0) return '';
  const date = new Date(timestampMs);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  if (!withMs) return `${h}:${m}:${s}`;
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}
