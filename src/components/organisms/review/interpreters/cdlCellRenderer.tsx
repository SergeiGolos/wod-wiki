/**
 * CDL Unified Cell Renderer
 *
 * Renders a single table cell from a ColumnDef + GridRow.
 * Replaces the old fixed-cell and metric-cell renderers.
 *
 * Responsibilities:
 * - Resolve the column source via cdlSourceResolver
 * - Apply the declared ColumnFormat (text, time, number, badge, pill, combined, custom)
 * - Render metric-type cells as MetricPill stacks
 * - Handle double-click for override editing on metric columns
 * - Preserve indentation semantics for hierarchy columns (e.g. Effort)
 */

import React, { useCallback, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { formatSecondsMMSS, formatSecondsHHMMSS } from '@/lib/formatTime';
import { MetricType } from '@/core/models/Metric';
import type { GridRow } from '../types';
import type {
  ColumnDef,
  ColumnFormat,
  ComputeContext,
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
  /** All rows in the grid (for derived column context) */
  allRows?: GridRow[];
  /** Index of this row within allRows (for derived column context) */
  rowIndex?: number;
  /** Indentation level (0-based) for visual hierarchy */
  indent?: number;
  /** Callback when a metric cell is double-clicked for override editing */
  onDoubleClick?: (blockKey: string, metricType: MetricType, anchorRect: DOMRect) => void;
  /** Optional additional CSS classes for the <td> */
  className?: string;
  /** Optional inline styles for the <td> */
  style?: CSSProperties;
  /** Optional definition map for dependency resolution */
  definitionMap?: ReadonlyMap<string, ColumnDef>;
}

// ─── Component ─────────────────────────────────────────────────

/**
 * Render a single table cell using a CDL ColumnDef.
 */
export const UnifiedCellRenderer: React.FC<UnifiedCellRendererProps> = ({
  columnDef,
  row,
  allRows,
  rowIndex,
  indent = 0,
  onDoubleClick,
  className,
  style,
  definitionMap,
}) => {
  const tdRef = useRef<HTMLTableCellElement>(null);

  const computeContext = useMemo<ComputeContext | undefined>(() => {
    if (!allRows || rowIndex === undefined) return undefined;
    return {
      allRows,
      rowIndex,
      columnDef,
      dependencies: new Map(),
    };
  }, [allRows, rowIndex, columnDef]);

  const rawValue = useMemo(
    () => resolveColumnSource(row, columnDef.source, computeContext, definitionMap),
    [row, columnDef.source, computeContext, definitionMap],
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
      style={style}
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

// ─── Combined Format ───────────────────────────────────────────

/** Level-specific visual styling for grouped cells. */
const LEVEL_STYLES = {
  primary: 'text-sm font-semibold text-foreground',
  secondary: 'text-xs text-muted-foreground',
  tertiary: 'text-[11px] text-muted-foreground opacity-80',
} as const;

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
    ? renderSubFormat(primary, format.primaryFormat ?? { type: 'text' }, row, 'primary')
    : null;
  const secondaryNode = secondary !== undefined
    ? renderSubFormat(secondary, format.secondaryFormat ?? { type: 'text' }, row, 'secondary')
    : null;
  const tertiaryNode = tertiary !== undefined
    ? renderSubFormat(tertiary, format.tertiaryFormat ?? { type: 'text' }, row, 'tertiary')
    : null;

  const isHorizontal = format.layout === 'horizontal';

  return (
    <div
      className={cn(
        'inline-flex',
        isHorizontal ? 'flex-row items-center gap-1' : 'flex-col items-start gap-0.5',
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
          {secondaryNode}
        </>
      )}
      {tertiaryNode && (
        <>
          {isHorizontal && format.separator && (
            <span className="text-muted-foreground">{format.separator}</span>
          )}
          {tertiaryNode}
        </>
      )}
    </div>
  );
}

function renderSubFormat(
  value: unknown,
  format: ColumnFormat,
  row?: GridRow,
  level?: 'primary' | 'secondary' | 'tertiary',
): React.ReactNode {
  const node = renderFormattedValue(value, format, 0, row);
  if (!level) return node;

  // Wrap in a span with level-specific styling so primary/secondary/tertiary
  // get their visual weight regardless of the inner format type.
  return (
    <span className={cn('inline-flex items-center', LEVEL_STYLES[level])}>
      {node}
    </span>
  );
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
 * This replaces the old metric-cell component.
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

