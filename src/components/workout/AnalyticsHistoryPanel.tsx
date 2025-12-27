/**
 * AnalyticsHistoryPanel - Historical execution view for Analyze screen
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - No "Active Context" section (all completed)
 * - Clickable segments for filtering analytics
 * - Uses unified visualization system
 * - Read-only historical data
 */

import React, { useMemo, useCallback } from 'react';
import { UnifiedItemList, IDisplayItem } from '../unified';
import { Segment } from '../../timeline/GitTreeSidebar';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';

export interface AnalyticsHistoryPanelProps {
  /** Historical segments to display */
  segments: Segment[];

  /** Currently selected segment IDs for filtering */
  selectedSegmentIds?: Set<number>;

  /** Callback when segment is clicked */
  onSelectSegment?: (segmentId: number) => void;

  /** Compact display mode */
  compact?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Convert a Segment to IDisplayItem for unified visualization
 */
function segmentToDisplayItem(segment: Segment, allSegments: Map<number, Segment>): IDisplayItem {
  // Calculate depth by traversing parent chain
  let depth = 0;
  let currentParentId = segment.parentId;
  const visited = new Set<number>();
  visited.add(segment.id);

  while (currentParentId !== null && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = allSegments.get(currentParentId);
    if (parent) {
      depth++;
      currentParentId = parent.parentId;
    } else {
      break;
    }
    if (depth > 20) break; // Safety limit
  }

  // Convert segment to fragments; prefer precomputed fragments if present
  const fragments = (segment.fragments && segment.fragments.length > 0)
    ? segment.fragments
    : segmentToFragments(segment);

  // Determine if this is a header (container types)
  const type = segment.type.toLowerCase();
  const isHeader = ['root', 'warmup', 'cooldown', 'main', 'work', 'rest'].includes(type) && depth < 2;

  return {
    id: segment.id.toString(),
    parentId: segment.parentId?.toString() ?? null,
    fragments,
    depth,
    isHeader,
    status: 'completed', // Analytics data is always completed
    sourceType: 'record',
    sourceId: segment.id,
    startTime: segment.startTime * 1000, // Convert to ms if needed
    endTime: segment.endTime * 1000,
    duration: segment.duration * 1000,
    label: segment.name
  };
}

/**
 * Convert segment data to ICodeFragment array
 */
function segmentToFragments(segment: Segment): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  const type = segment.type.toLowerCase();

  // Segment name as action/effort fragment
  const fragmentType = type === 'work' ? FragmentType.Effort :
    type === 'rest' ? FragmentType.Action :
      FragmentType.Action;

  fragments.push({
    type: type,
    fragmentType,
    value: segment.name,
    image: segment.name
  });

  // Duration
  if (segment.duration > 0) {
    const mins = Math.floor(segment.duration / 60);
    const secs = Math.floor(segment.duration % 60);
    const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

    fragments.push({
      type: 'time',
      fragmentType: FragmentType.Timer,
      value: segment.duration,
      image: timeStr
    });
  }

  // Power metric
  if ((segment.avgPower ?? 0) > 0) {
    fragments.push({
      type: 'power',
      fragmentType: FragmentType.Resistance,
      value: segment.avgPower,
      image: `${Math.round(segment.avgPower ?? 0)}W`
    });
  }

  // Heart rate metric
  if ((segment.avgHr ?? 0) > 0) {
    fragments.push({
      type: 'heart_rate',
      fragmentType: FragmentType.Text,
      value: segment.avgHr,
      image: `${Math.round(segment.avgHr ?? 0)}♥`
    });
  }

  return fragments;
}

/**
 * AnalyticsHistoryPanel Component - Uses unified visualization system
 */
export const AnalyticsHistoryPanel: React.FC<AnalyticsHistoryPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
  compact = false,
  className = ''
}) => {
  // Convert segments to display items (sorted oldest-first)
  const items = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    const segmentMap = new Map(segments.map(s => [s.id, s]));

    return sorted.map(segment => segmentToDisplayItem(segment, segmentMap));
  }, [segments]);

  // Convert selected IDs to string set for UnifiedItemList
  const selectedIds = useMemo(() =>
    new Set(Array.from(selectedSegmentIds).map(String)),
    [selectedSegmentIds]
  );

  // Handle selection - convert string ID back to number
  const handleSelectionChange = useCallback((id: string | null) => {
    if (id) {
      onSelectSegment?.(parseInt(id, 10));
    }
  }, [onSelectSegment]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <UnifiedItemList
        items={items}
        selectedIds={selectedIds}
        compact={compact}
        showDurations
        autoScroll={false}
        groupLinked={false}
        onSelectionChange={onSelectSegment ? handleSelectionChange : undefined}
        className="flex-1"
        emptyMessage="No historical data available"
      />

      {/* Selection Info */}
      {selectedSegmentIds.size > 0 && (
        <div className="p-2 border-t border-border text-xs text-muted-foreground bg-muted/10">
          {selectedSegmentIds.size} segment{selectedSegmentIds.size !== 1 ? 's' : ''} selected for analysis
        </div>
      )}
    </div>
  );
};
