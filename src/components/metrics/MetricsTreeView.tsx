import React, { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface MetricItem {
  id: string;
  parentId: string | null;
  lane: number;
  // Data for the card
  title: string;
  icon?: React.ReactNode;
  tags?: React.ReactNode;
  footer?: React.ReactNode;
  status?: 'active' | 'completed' | 'pending';
  // For sorting/layout
  startTime?: number;
}

export interface MetricsTreeViewProps {
  items: MetricItem[];
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  className?: string;
  autoScroll?: boolean;
  renderItem?: (item: MetricItem, isSelected: boolean) => React.ReactNode;
}

const ROW_HEIGHT = 64; // Height of each list item (approx, can be dynamic if we want, but fixed is easier for lines)
const LANE_WIDTH = 24; // Width between vertical lines
const LEFT_MARGIN = 16;

export const MetricsTreeView: React.FC<MetricsTreeViewProps> = ({
  items,
  selectedIds = new Set(),
  onSelect,
  className,
  autoScroll = false,
  renderItem
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort items if needed, or assume they are passed in the correct display order.
  // For now, let's assume the consumer sorts them (e.g. newest first or oldest first).
  // However, for the lines to work, we need to know the index of the parent.
  
  // Let's assume 'items' is the display order.
  
  // Generate SVG paths
  const connections = useMemo(() => {
    return items.map((item, index) => {
      if (!item.parentId) return null;
      
      const parentIndex = items.findIndex(i => i.id === item.parentId);
      if (parentIndex === -1) return null; // Parent not found in current view
      
      // Coordinates
      // We want to draw from the parent's dot to the child's dot.
      // Parent dot X: LEFT_MARGIN + (parent.lane * LANE_WIDTH)
      // Child dot X: LEFT_MARGIN + (item.lane * LANE_WIDTH)
      
      // Y coordinates depend on the row index.
      // We assume fixed row height for now for simplicity of lines.
      // If rows are variable, we'd need to calculate offsets.
      // Let's try to stick to a consistent alignment for the dots.
      
      // NOTE: If the list is "Newest First" (Track view), the parent is usually BELOW the child (higher index).
      // If "Oldest First" (Analyze view), parent is ABOVE (lower index).
      
      const parentItem = items[parentIndex];
      
      const startX = LEFT_MARGIN + (parentItem.lane * LANE_WIDTH) + 5; // +5 for dot center (approx)
      const startY = (parentIndex * ROW_HEIGHT) + 24; // +24 for vertical center of dot
      
      const endX = LEFT_MARGIN + (item.lane * LANE_WIDTH) + 5;
      const endY = (index * ROW_HEIGHT) + 24;
      
      // Draw curve
      // If parent is below (startY > endY), we go up from parent.
      // If parent is above (startY < endY), we go down from parent.
      
      // Adjust for direction
      const isParentBelow = startY > endY;
      const midY = isParentBelow ? endY + 15 : endY - 15;
      
      const path = `
        M ${startX} ${startY}
        L ${startX} ${midY}
        C ${startX} ${endY}, ${startX} ${endY}, ${endX} ${endY}
      `;
      
      return (
        <path
          key={`conn-${item.id}`}
          d={path}
          fill="none"
          stroke={selectedIds.has(item.id) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
          strokeWidth="2"
          className="transition-colors duration-300 opacity-50"
        />
      );
    });
  }, [items, selectedIds]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {/* SVG Layer */}
        <svg 
          className="absolute top-0 left-0 w-full pointer-events-none" 
          style={{ height: Math.max(items.length * ROW_HEIGHT, 100) }}
        >
          {connections}
        </svg>

        {/* Items */}
        <div className="relative">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const xOffset = LEFT_MARGIN + (item.lane * LANE_WIDTH);
            
            return (
              <div
                key={item.id}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  "group relative flex items-center cursor-pointer transition-all border-b border-border/50",
                  isSelected ? "bg-muted/80" : "hover:bg-muted/30"
                )}
                style={{ minHeight: ROW_HEIGHT }}
              >
                {/* Dot Area */}
                <div className="relative shrink-0" style={{ width: xOffset + 20, height: ROW_HEIGHT }}>
                  <div 
                    className={cn(
                      "absolute top-6 w-2.5 h-2.5 rounded-full border-2 z-10 transition-all",
                      isSelected 
                        ? "bg-background border-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] scale-125" 
                        : "bg-background border-muted-foreground group-hover:border-foreground"
                    )}
                    style={{ left: xOffset }}
                  />
                </div>

                {/* Content Area */}
                <div className="flex-1 pr-2 py-1 min-w-0">
                  {renderItem ? renderItem(item, isSelected) : (
                    <DefaultMetricCard item={item} isSelected={isSelected} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DefaultMetricCard: React.FC<{ item: MetricItem; isSelected: boolean }> = ({ item, isSelected }) => {
  return (
    <div className={cn(
      "rounded border transition-all flex items-center gap-2 py-1 px-1.5",
      isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border"
    )}>
      {item.icon && (
        <div className="flex-shrink-0 text-primary h-3 w-3">
          {item.icon}
        </div>
      )}
      
      <span className="truncate flex-shrink-0 max-w-[100px] text-[11px] font-medium">
        {item.title}
      </span>
      
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex flex-wrap gap-1">
          {item.tags}
        </div>
      </div>
      
      {item.footer && (
        <div className="flex-shrink-0 text-[9px] font-mono text-muted-foreground">
          {item.footer}
        </div>
      )}
    </div>
  );
};
