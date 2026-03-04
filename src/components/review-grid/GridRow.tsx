/**
 * GridRow — Row renderer for the review grid.
 *
 * Renders one table row per GridRow, mapping visible columns to cells.
 * Fixed columns render their scalar values directly; metrics columns
 * delegate to GridCell for multi-pill rendering.
 */

import React from 'react';
import { MetricType } from '@/core/models/Metric';
import type { GridRow as GridRowData, GridColumn } from './types';
import { FIXED_COLUMN_IDS } from './types';
import { GridCell } from './GridCell';
import { formatSecondsMMSS } from '@/lib/formatTime';

interface GridRowProps {
  /** The row data to render */
  row: GridRowData;
  /** Visible columns (already filtered) */
  columns: GridColumn[];
  /** Whether this row is currently selected */
  isSelected: boolean;
  /** Callback when the row is clicked */
  onSelect: (id: number, modifiers: { ctrlKey: boolean; shiftKey: boolean }) => void;
  /** Whether the row's block key is currently hovered (cross-panel highlight) */
  isHovered: boolean;
  /** Callback when the mouse enters/leaves row */
  onHover: (blockKey: string | null) => void;
  /** Callback when a metrics cell is double-clicked for override editing */
  onCellDoubleClick?: (blockKey: string, metricType: MetricType, anchorRect: DOMRect) => void;
}

/**
 * Render a single data row in the review grid table.
 */
export const GridRow: React.FC<GridRowProps> = ({
  row,
  columns,
  isSelected,
  onSelect,
  isHovered,
  onHover,
  onCellDoubleClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(row.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
  };

  return (
    <tr
      className={[
        'border-b border-border/20 last:border-0 transition-colors cursor-pointer',
        isSelected
          ? 'bg-primary/10 dark:bg-primary/20'
          : isHovered
            ? 'bg-muted/50 dark:bg-muted/40'
            : 'hover:bg-muted/30 dark:hover:bg-muted/20',
      ].join(' ')}
      onClick={handleClick}
      onMouseEnter={() => onHover(row.sourceBlockKey)}
      onMouseLeave={() => onHover(null)}
    >
      {columns.map((col) => (
        <React.Fragment key={col.id}>
          {renderFixedCell(col, row) ?? (
            <GridCell
              cell={col.metricType ? row.cells.get(col.metricType) : undefined}
              metricType={col.metricType}
              blockKey={row.sourceBlockKey}
              indent={
                (col.metricType === MetricType.System || col.metricType === MetricType.Effort)
                  ? row.stackLevel
                  : 0
              }
              onDoubleClick={onCellDoubleClick}
            />
          )}
        </React.Fragment>
      ))}
    </tr>
  );
};

/**
 * Render a fixed (non-metrics) column cell, or return null to fall through
 * to the GridCell renderer.
 */
function renderFixedCell(col: GridColumn, row: GridRowData): React.ReactNode | null {
  switch (col.id) {
    case FIXED_COLUMN_IDS.INDEX:
      return (
        <td
          className={`py-1 pl-3 pr-2 font-mono text-xs w-10 text-right ${outputTypeBadgeClass(row.outputType)}`}
          title={`Type: ${row.outputType}\nBlock: ${row.sourceBlockKey}`}
        >
          {row.index}
        </td>
      );

    case FIXED_COLUMN_IDS.BLOCK_KEY:
      return (
        <td className="py-1 px-2 text-foreground truncate max-w-[160px] text-sm" title={row.sourceBlockKey}>
          {row.sourceBlockKey}
        </td>
      );

    case FIXED_COLUMN_IDS.OUTPUT_TYPE:
      return (
        <td className="py-1 px-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${outputTypeBadgeClass(row.outputType)}`}>
            {row.outputType}
          </span>
        </td>
      );

    case FIXED_COLUMN_IDS.STACK_LEVEL:
      return (
        <td className="py-1 px-2 text-muted-foreground font-mono text-xs text-center w-12">
          {row.stackLevel}
        </td>
      );

    case FIXED_COLUMN_IDS.ELAPSED_TOTAL:
      return (
        <td className="py-1 px-2 text-foreground font-mono text-xs text-right w-32 whitespace-nowrap">
          {row.elapsed === row.total
            ? formatSecondsMMSS(row.elapsed)
            : `${formatSecondsMMSS(row.elapsed)} / ${formatSecondsMMSS(row.total)}`}
        </td>
      );

    case FIXED_COLUMN_IDS.SPANS:
      return (
        <td className="py-1 px-2 text-muted-foreground font-mono text-[10px] text-center w-40 whitespace-nowrap">
          {formatSpans(row.spans, row.duration)}
        </td>
      );

    case FIXED_COLUMN_IDS.TIMESTAMP:
      return (
        <td className="py-1 px-2 text-muted-foreground font-mono text-[10px] text-center w-24 whitespace-nowrap">
          {formatTimestamp(row.absoluteStartTime, !col.meta?.hideMs)}
        </td>
      );

    case FIXED_COLUMN_IDS.COMPLETION_REASON:
      return (
        <td className="py-1 px-2 text-muted-foreground text-xs truncate max-w-[120px]" title={row.completionReason}>
          {row.completionReason ?? ''}
        </td>
      );

    default:
      return null;
  }
}

/**
 * Badge color classes for output types.
 */
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

/**
 * Format spans into a human-readable string.
 * "start - finish" across spans, or just "timestamp" if duration is 0.
 */
function formatSpans(spans?: { started: number; ended?: number }[], durationSeconds: number = 0): string {
  if (!spans || spans.length === 0) return '';

  const format = (s: number) => formatSecondsMMSS(s);

  if (durationSeconds === 0) {
    // Instantaneous event
    return format(spans[0].started);
  }

  // Span range
  const start = format(spans[0].started);
  const endSpan = spans[spans.length - 1];

  // If undefined end (open block), just show start (no "...")
  if (endSpan.ended === undefined) {
    return start;
  }

  const end = format(endSpan.ended);

  // If instantaneous (or very close), just show one time
  if (start === end) {
    return start;
  }

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
