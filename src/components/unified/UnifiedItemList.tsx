/**
 * UnifiedItemList.tsx - List component for unified visualization
 * 
 * Renders a list of IDisplayItem objects with support for:
 * - Auto-scrolling to active items
 * - Linked item grouping
 * - Compact mode
 * - Selection and highlighting
 * 
 * @see docs/deep-dives/unified-visualization-implementation-guide.md
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { IDisplayItem, isActiveItem, VisualizerSize, VisualizerFilter } from '@/core/models/DisplayItem';
import { UnifiedItemRow } from './UnifiedItemRow';
import { groupLinkedItems } from '@/core/adapters/displayItemAdapters';

export interface UnifiedItemListProps {
  /** Items to display */
  items: IDisplayItem[];
  /** ID of the currently active item (for highlighting) */
  activeItemId?: string;
  /** Set of selected item IDs */
  selectedIds?: Set<string>;
  /** Display size variant @default 'normal' */
  size?: VisualizerSize;
  /** Optional filter configuration */
  filter?: VisualizerFilter;
  /** @deprecated Use size='compact' instead */
  compact?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show durations */
  showDurations?: boolean;
  /** Group linked items visually */
  groupLinked?: boolean;
  /** Auto-scroll to active/new items */
  autoScroll?: boolean;
  /** Scroll behavior */
  scrollBehavior?: 'smooth' | 'auto';
  /** Render custom actions for each item */
  renderActions?: (item: IDisplayItem) => React.ReactNode;
  /** Selection change handler */
  onSelectionChange?: (id: string | null) => void;
  /** Hover change handler */
  onHover?: (id: string | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Message to show when list is empty */
  emptyMessage?: string;
  /** Maximum height with scroll (undefined = no max height) */
  maxHeight?: string | number;
}

/**
 * LinkedGroup - Visual wrapper for grouped linked items
 */
const LinkedGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {


  return (
    <div className="border-l-2 border-orange-400/50 ml-2 pl-1 my-1 rounded-r">
      {children}
    </div>
  );
};

export const UnifiedItemList: React.FC<UnifiedItemListProps> = ({
  items,
  activeItemId,
  selectedIds,
  size: sizeProp = 'normal',
  filter,
  compact: compactProp,
  showTimestamps = false,
  showDurations = false,
  groupLinked = true,
  autoScroll = true,
  scrollBehavior = 'smooth',
  renderActions,
  onSelectionChange,
  onHover,
  className,
  emptyMessage = "No items to display",
  maxHeight
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Backward compatibility
  const size = compactProp ? 'compact' : sizeProp;

  // Process items: optionally group linked items
  const processedItems = useMemo(() => {
    if (!groupLinked) {
      return items.map(item => ({ type: 'single' as const, item }));
    }

    const grouped = groupLinkedItems(items);
    return grouped.map(entry => {
      if (Array.isArray(entry)) {
        return { type: 'group' as const, items: entry };
      }
      return { type: 'single' as const, item: entry };
    });
  }, [items, groupLinked]);

  // Find active item for auto-scroll
  const activeItem = useMemo(() => {
    if (activeItemId) {
      return items.find(item => item.id === activeItemId);
    }
    // Fallback to first item with 'active' status
    return items.find(isActiveItem);
  }, [items, activeItemId]);

  // Auto-scroll to active item
  useEffect(() => {
    if (autoScroll && activeItem && activeItemRef.current && scrollRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: scrollBehavior,
        block: 'nearest'
      });
    }
  }, [autoScroll, activeItem, scrollBehavior]);

  // Handlers
  const handleItemClick = useCallback((item: IDisplayItem) => {
    onSelectionChange?.(item.id);
  }, [onSelectionChange]);

  const handleItemHover = useCallback((item: IDisplayItem | null) => {
    onHover?.(item?.id ?? null);
  }, [onHover]);

  // Render a single item row
  const renderItem = (item: IDisplayItem, isInGroup = false) => {
    const isActive = activeItemId
      ? item.id === activeItemId
      : isActiveItem(item);
    const isSelected = selectedIds?.has(item.id) ?? false;

    return (
      <div
        key={item.id}
        ref={isActive ? activeItemRef : undefined}
      >
        <UnifiedItemRow
          item={item}
          isSelected={isSelected}
          isHighlighted={isActive && !isSelected}
          size={size}
          filter={filter}
          showTimestamp={showTimestamps}
          showDuration={showDurations}
          actions={renderActions?.(item)}
          onClick={onSelectionChange ? handleItemClick : undefined}
          onHover={onHover ? handleItemHover : undefined}
          className={isInGroup ? 'border-l-orange-400/30' : undefined}
        />
      </div>
    );
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center text-muted-foreground text-sm',
        size === 'compact' ? 'p-2' : size === 'focused' ? 'p-6' : 'p-4',
        className
      )}>
        {emptyMessage}
      </div>
    );
  }



  return (
    <div
      ref={scrollRef}
      className={cn(
        'overflow-y-auto',
        className
      )}
      style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
    >
      <div>
        {processedItems.map((entry, index) => {
          if (entry.type === 'group') {
            return (
              <LinkedGroup key={`group-${index}`}>
                {entry.items.map(item => renderItem(item, true))}
              </LinkedGroup>
            );
          }
          return renderItem(entry.item);
        })}
      </div>
    </div>
  );
};

export default UnifiedItemList;
