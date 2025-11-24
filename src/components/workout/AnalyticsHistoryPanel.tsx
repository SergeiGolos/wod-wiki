/**
 * AnalyticsHistoryPanel - Historical execution view for Analyze screen
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - No "Active Context" section (all completed)
 * - Clickable segments for filtering analytics
 * - Git-tree-like visualization with selection support
 * - Read-only historical data
 */

import React from 'react';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';

export interface AnalyticsHistoryPanelProps {
  /** Historical segments to display */
  segments: Segment[];
  
  /** Currently selected segment IDs for filtering */
  selectedSegmentIds?: Set<number>;
  
  /** Callback when segment is clicked */
  onSelectSegment?: (segmentId: number) => void;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * AnalyticsHistoryPanel Component
 */
export const AnalyticsHistoryPanel: React.FC<AnalyticsHistoryPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
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
    <div className={`flex flex-col h-full ${className}`}>
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
        <div className="p-2 border-t border-border text-xs text-muted-foreground bg-muted/10">
          {selectedSegmentIds.size} segment{selectedSegmentIds.size !== 1 ? 's' : ''} selected for analysis
        </div>
      )}
    </div>
  );
};
