/**
 * GridCell — Multi-metrics cell renderer.
 *
 * Renders all metrics of a single MetricType within one table cell.
 * Multiple metric appear as stacked pills/badges.
 * Double-clicking opens the user override dialog.
 */

import React, { useCallback, useRef } from 'react';
import type { MetricType } from '@/core/models/Metric';
import type { GridCell as GridCellData } from './types';
import { MetricPill } from './MetricPill';

interface GridCellProps {
  /** Cell data (may be undefined if the row has no metrics of this type) */
  cell?: GridCellData;
  /** Fragment type for this column (needed for override targeting) */
  metricType?: MetricType;
  /** Block key of the row (needed for override targeting) */
  blockKey?: string;
  /** Indentation level (0-based) for visual hierarchy */
  indent?: number;
  /** Callback when a cell is double-clicked for override editing */
  onDoubleClick?: (blockKey: string, metricType: MetricType, anchorRect: DOMRect) => void;
}

/**
 * Render a grid cell containing zero or more metrics pills.
 * Empty cells render as a dim dash. Double-click triggers override dialog.
 */
export const GridCell: React.FC<GridCellProps> = ({ cell, metricType, blockKey, indent = 0, onDoubleClick }) => {
  const tdRef = useRef<HTMLTableCellElement>(null);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (metricType && blockKey && onDoubleClick && tdRef.current) {
        const rect = tdRef.current.getBoundingClientRect();
        onDoubleClick(blockKey, metricType, rect);
      }
    },
    [metricType, blockKey, onDoubleClick],
  );

  const content = (
    <div className="flex flex-wrap gap-1 items-center">
      {/* Indentation spacer */}
      {indent > 0 && (
        <div
          className="flex-shrink-0 mr-1 border-l-2 border-muted h-4"
          style={{ width: `${indent * 12}px`, marginLeft: '2px' }}
        />
      )}

      {(!cell || cell.metrics.length === 0) ? (
        <span className="text-muted-foreground/40 text-xs">—</span>
      ) : (
        cell.metrics.map((frag, idx) => (
          <MetricPill key={idx} metric={frag} />
        ))
      )}
    </div>
  );

  return (
    <td
      ref={tdRef}
      className={`py-1 px-2 cursor-cell ${(!cell || cell.metrics.length === 0) ? 'text-center' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      {content}
    </td>
  );
};
