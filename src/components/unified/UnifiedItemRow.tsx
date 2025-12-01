/**
 * UnifiedItemRow.tsx - Single item row for unified visualization
 * 
 * Renders any IDisplayItem (statement, block, or span) consistently
 * using FragmentVisualizer for visual content.
 * 
 * @see docs/deep-dives/unified-visualization-implementation-guide.md
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FragmentVisualizer } from '@/views/runtime/FragmentVisualizer';
import { IDisplayItem, isActiveItem, isCompletedItem } from '@/core/models/DisplayItem';

export interface UnifiedItemRowProps {
  /** The item to display */
  item: IDisplayItem;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Whether this item is highlighted (e.g., hovered) */
  isHighlighted?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Show timestamp column */
  showTimestamp?: boolean;
  /** Show duration column */
  showDuration?: boolean;
  /** Render custom actions (e.g., buttons) */
  actions?: React.ReactNode;
  /** Click handler */
  onClick?: (item: IDisplayItem) => void;
  /** Hover handler */
  onHover?: (item: IDisplayItem | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp for display (HH:MM:SS)
 */
function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '';
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Get status indicator color classes
 */
function getStatusClasses(item: IDisplayItem): string {
  switch (item.status) {
    case 'active':
      return 'border-l-green-500 bg-green-500/5';
    case 'completed':
      return 'border-l-blue-500/50';
    case 'failed':
      return 'border-l-red-500 bg-red-500/5';
    case 'skipped':
      return 'border-l-gray-400/50';
    case 'pending':
    default:
      return 'border-l-transparent';
  }
}

/**
 * Get status indicator dot
 */
function StatusDot({ status }: { status: IDisplayItem['status'] }) {
  const colorMap = {
    active: 'bg-green-500 animate-pulse',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    skipped: 'bg-gray-400',
    pending: 'bg-gray-300'
  };
  
  return (
    <span 
      className={cn(
        'inline-block w-2 h-2 rounded-full flex-shrink-0',
        colorMap[status]
      )}
      title={status}
    />
  );
}

export const UnifiedItemRow: React.FC<UnifiedItemRowProps> = ({
  item,
  isSelected = false,
  isHighlighted = false,
  compact = false,
  showTimestamp = false,
  showDuration = false,
  actions,
  onClick,
  onHover,
  className
}) => {
  const indentSize = 16; // pixels per depth level
  const paddingLeft = item.depth * indentSize;
  
  const handleClick = () => {
    onClick?.(item);
  };
  
  const handleMouseEnter = () => {
    onHover?.(item);
  };
  
  const handleMouseLeave = () => {
    onHover?.(null);
  };
  
  // Calculate duration from timestamps if not provided
  const duration = item.duration ?? 
    (item.startTime && item.endTime ? item.endTime - item.startTime : undefined);
  
  return (
    <div
      className={cn(
        // Base styles
        'flex items-center gap-2 border-l-2 transition-colors',
        // Padding based on compact mode
        compact ? 'px-2 py-0.5' : 'px-3 py-1.5',
        // Status-based left border color
        getStatusClasses(item),
        // Header styling
        item.isHeader && 'font-semibold bg-muted/30',
        // Interactive states
        onClick && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-l-primary',
        isHighlighted && 'bg-muted/40',
        // Active item glow
        isActiveItem(item) && 'ring-1 ring-green-500/30',
        // Completed item fade
        isCompletedItem(item) && 'opacity-80',
        // Custom className
        className
      )}
      style={{ paddingLeft: `${paddingLeft + (compact ? 8 : 12)}px` }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Status indicator dot */}
      <StatusDot status={item.status} />
      
      {/* Linked indicator */}
      {item.isLinked && (
        <span className="text-orange-500 text-xs font-bold" title="Linked item">
          +
        </span>
      )}
      
      {/* Main content: fragments */}
      <div className="flex-1 min-w-0">
        {item.fragments.length > 0 ? (
          <FragmentVisualizer 
            fragments={item.fragments} 
            compact={compact}
            className="inline-flex"
          />
        ) : item.label ? (
          <span className={cn(
            'text-muted-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {item.label}
          </span>
        ) : (
          <span className="text-muted-foreground/50 italic text-xs">
            No data
          </span>
        )}
      </div>
      
      {/* Timestamp column */}
      {showTimestamp && item.startTime && (
        <span className={cn(
          'text-muted-foreground font-mono flex-shrink-0',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          {formatTimestamp(item.startTime)}
        </span>
      )}
      
      {/* Duration column */}
      {showDuration && duration !== undefined && (
        <span className={cn(
          'text-muted-foreground font-mono flex-shrink-0 min-w-[40px] text-right',
          compact ? 'text-[10px]' : 'text-xs'
        )}>
          {formatDuration(duration)}
        </span>
      )}
      
      {/* Custom actions slot */}
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
};

export default UnifiedItemRow;
