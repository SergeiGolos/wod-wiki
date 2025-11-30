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
import { MetricsTreeView, MetricItem } from '../metrics/MetricsTreeView';
import { Segment } from '../../timeline/GitTreeSidebar';
import { Activity, Clock, Pause } from 'lucide-react';

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
  // Convert segments to MetricItems and sort OLDEST-FIRST
  const items = React.useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    
    return sorted.map(seg => {
      const type = seg.type.toLowerCase();
      return {
        id: seg.id.toString(),
        parentId: seg.parentId ? seg.parentId.toString() : null,
        lane: seg.lane || 0, // Use existing lane or calculate? GitTreeSidebar calculated it? No, it was passed in or 0.
        // We might need to recalculate lanes if they aren't correct in the segment data
        title: seg.name,
        startTime: seg.startTime,
        icon: type === 'work' ? <Activity className="h-3 w-3 text-red-500" /> :
              type === 'rest' ? <Pause className="h-3 w-3 text-green-500" /> :
              <Clock className="h-3 w-3 text-blue-500" />,
        tags: (
          <div className="flex flex-wrap gap-1 gap-0.5">
             <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-opacity-60 shadow-sm 
               ${type === 'work' ? 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100' : 
                 type === 'rest' ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100' :
                 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100'}`}>
               <span>{seg.name}</span>
             </span>
             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100 bg-opacity-60 shadow-sm">
               <span className="text-base leading-none">⏱️</span>
               <span>{Math.floor(seg.duration)}s</span>
             </span>
             {seg.avgPower > 0 && (
               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-red-100 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100 bg-opacity-60 shadow-sm">
                 <span className="text-base leading-none">💪</span>
                 <span>{Math.round(seg.avgPower)}W</span>
               </span>
             )}
          </div>
        ),
        footer: (
          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            {seg.avgPower > 0 && <span>{Math.round(seg.avgPower)}W</span>}
            {seg.avgHr > 0 && <span>{Math.round(seg.avgHr)}♥</span>}
          </div>
        )
      } as MetricItem;
    });
  }, [segments]);

  const handleSelect = React.useCallback((itemId: string) => {
    onSelectSegment?.(parseInt(itemId));
  }, [onSelectSegment]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No historical data available
          </div>
        ) : (
          <MetricsTreeView 
            items={items}
            selectedIds={new Set(Array.from(selectedSegmentIds).map(String))}
            onSelect={handleSelect}
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
