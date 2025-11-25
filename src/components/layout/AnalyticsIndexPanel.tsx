/**
 * AnalyticsIndexPanel - Segment selection for Analyze view
 * 
 * Renamed from AnalyticsHistoryPanel to follow the *IndexPanel naming convention.
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - Clickable segments for filtering analytics
 * - Git-tree-like visualization with selection support
 * - Read-only historical data
 */

import React from 'react';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { cn } from '../../lib/utils';

export interface AnalyticsIndexPanelProps {
  /** Historical segments to display */
  segments: Segment[];
  
  /** Currently selected segment IDs for filtering */
  selectedSegmentIds?: Set<number>;
  
  /** Callback when segment is clicked */
  onSelectSegment?: (segmentId: number) => void;
  
  /** Whether to render in mobile mode */
  mobile?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * AnalyticsIndexPanel Component
 */
export const AnalyticsIndexPanel: React.FC<AnalyticsIndexPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
  mobile = false,
  className = ''
}) => {
  // Sort segments OLDEST-FIRST (chronological order)
  const sortedSegments = React.useMemo(() => {
    return [...segments].sort((a, b) => a.startTime - b.startTime);
  }, [segments]);

  const handleSelect = React.useCallback((segmentId: number) => {
    onSelectSegment?.(segmentId);
  }, [onSelectSegment]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Always show on mobile */}
      {mobile && (
        <div className="p-4 border-b border-border bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold">Analytics Index</h3>
        </div>
      )}
      
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedSegments.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No historical data available
          </div>
        ) : (
          <GitTreeSidebar 
            segments={sortedSegments}
            selectedIds={selectedSegmentIds}
            onSelect={handleSelect}
            disableScroll={true}
            hideHeader={true}
          />
        )}
      </div>

      {/* Selection Info */}
      {selectedSegmentIds.size > 0 && (
        <div className="p-2 border-t border-border text-xs text-muted-foreground bg-muted/10 shrink-0">
          {selectedSegmentIds.size} segment{selectedSegmentIds.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default AnalyticsIndexPanel;
