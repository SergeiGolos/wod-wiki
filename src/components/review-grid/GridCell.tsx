/**
 * GridCell — Multi-fragment cell renderer.
 *
 * Renders all fragments of a single FragmentType within one table cell.
 * Multiple fragments appear as stacked pills/badges.
 * Double-clicking opens the user override dialog.
 */

import React, { useCallback, useRef } from 'react';
import type { FragmentType } from '@/core/models/CodeFragment';
import type { GridCell as GridCellData } from './types';
import { FragmentPill } from './FragmentPill';

interface GridCellProps {
  /** Cell data (may be undefined if the row has no fragments of this type) */
  cell?: GridCellData;
  /** Fragment type for this column (needed for override targeting) */
  fragmentType?: FragmentType;
  /** Block key of the row (needed for override targeting) */
  blockKey?: string;
  /** Indentation level (0-based) for visual hierarchy */
  indent?: number;
  /** Callback when a cell is double-clicked for override editing */
  onDoubleClick?: (blockKey: string, fragmentType: FragmentType, anchorRect: DOMRect) => void;
}

/**
 * Render a grid cell containing zero or more fragment pills.
 * Empty cells render as a dim dash. Double-click triggers override dialog.
 */
export const GridCell: React.FC<GridCellProps> = ({ cell, fragmentType, blockKey, indent = 0, onDoubleClick }) => {
  const tdRef = useRef<HTMLTableCellElement>(null);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (fragmentType && blockKey && onDoubleClick && tdRef.current) {
        const rect = tdRef.current.getBoundingClientRect();
        onDoubleClick(blockKey, fragmentType, rect);
      }
    },
    [fragmentType, blockKey, onDoubleClick],
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

      {(!cell || cell.fragments.length === 0) ? (
        <span className="text-muted-foreground/40 text-xs">—</span>
      ) : (
        cell.fragments.map((frag, idx) => (
          <FragmentPill key={idx} fragment={frag} />
        ))
      )}
    </div>
  );

  return (
    <td
      ref={tdRef}
      className={`py-1 px-2 cursor-cell ${(!cell || cell.fragments.length === 0) ? 'text-center' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      {content}
    </td>
  );
};
