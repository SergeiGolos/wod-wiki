/**
 * AnalyticsIndexPanel - Segment selection for Analyze view
 * 
 * Renamed from AnalyticsHistoryPanel to follow the *IndexPanel naming convention.
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - Clickable segments for filtering analytics
 * - Uses unified visualization system with FragmentVisualizer
 * - Read-only historical data with power/HR metrics
 */

import React, { useMemo, useCallback } from 'react';
import { UnifiedItemList, IDisplayItem } from '../unified';
import { cn } from '../../lib/utils';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { AnalyticsGroup, Segment } from '../../core/models/AnalyticsModels';

export interface AnalyticsIndexPanelProps {
  /** Historical segments to display */
  segments: Segment[];
  
  /** Available metric groups for display configuration */
  groups?: AnalyticsGroup[];
  
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
 * Format timestamp to HH:MM:SS
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Map segment type to fragment type
 */
function getFragmentTypeFromSegmentType(type: string): FragmentType {
  const typeMapping: Record<string, FragmentType> = {
    'work': FragmentType.Effort,
    'interval': FragmentType.Rounds,
    'rest': FragmentType.Action,
    'recovery': FragmentType.Action,
    'warmup': FragmentType.Timer,
    'cooldown': FragmentType.Timer,
    'root': FragmentType.Action,
    'ramp': FragmentType.Increment,
  };
  return typeMapping[type.toLowerCase()] || FragmentType.Text;
}

/**
 * Convert segment to fragment array for visualization
 */
function segmentToFragments(segment: Segment, groups: AnalyticsGroup[]): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  
  // Add type fragment
  fragments.push({
    type: segment.type,
    fragmentType: getFragmentTypeFromSegmentType(segment.type),
    value: segment.type,
    image: segment.type,
  });
  
  // Add Start Time as timer fragment
  fragments.push({
    type: 'timer',
    fragmentType: FragmentType.Timer,
    value: segment.startTime,
    image: formatTimestamp(segment.startTime),
  });
  
  // Add dynamic metrics based on groups or fallback to all available
  Object.entries(segment.metrics).forEach(([key, value]) => {
    if (value > 0) {
      let unit = '';
      let type = FragmentType.Text;
      
      // Try to find config in groups first
      let config = null;
      for (const g of groups) {
        config = g.graphs.find(gr => gr.id === key);
        if (config) {
          unit = config.unit;
          break;
        }
      }
      
      if (!config) {
        switch(key) {
          case 'power': unit = 'W'; type = FragmentType.Resistance; break;
          case 'resistance': unit = 'kg'; type = FragmentType.Resistance; break;
          case 'distance': unit = 'm'; type = FragmentType.Distance; break;
          case 'repetitions': unit = 'reps'; type = FragmentType.Rep; break;
          case 'heart_rate': unit = 'bpm'; type = FragmentType.Text; break;
          case 'cadence': unit = 'rpm'; type = FragmentType.Text; break;
          case 'speed': unit = 'km/h'; type = FragmentType.Text; break;
        }
      }
      
      fragments.push({
        type: key,
        fragmentType: type,
        value: value,
        image: `${Math.round(value)}${unit}`,
      });
    }
  });
  
  return fragments;
}

/**
 * Convert segment to IDisplayItem for unified visualization
 */
function segmentToDisplayItem(
  segment: Segment, 
  allSegments: Map<number, Segment>,
  groups: AnalyticsGroup[]
): IDisplayItem {
  const type = segment.type.toLowerCase();
  
  // Use depth directly if available, otherwise calculate
  let depth = segment.depth || 0;
  if (depth === 0 && segment.parentId !== null) {
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
      if (depth > 20) break;
    }
  }
  
  // Determine if this is a header/separator
  const isSeparator = ['round', 'interval', 'warmup', 'cooldown'].includes(type);
  const isRoot = type === 'root';
  const isHeader = isRoot || (isSeparator && depth < 2);
  
  // Convert to fragments (skip for separators except root)
  const fragments = (isSeparator && !isRoot) ? [] : segmentToFragments(segment, groups);
  
  return {
    id: segment.id.toString(),
    parentId: segment.parentId?.toString() ?? null,
    fragments,
    depth,
    isHeader,
    status: 'completed',
    sourceType: 'record',
    sourceId: segment.id,
    startTime: segment.startTime,
    endTime: segment.endTime,
    duration: segment.duration,
    label: segment.name
  };
}

/**
 * AnalyticsIndexPanel Component - Uses unified visualization system
 */
export const AnalyticsIndexPanel: React.FC<AnalyticsIndexPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
  mobile = false,
  groups = [],
  className = ''
}) => {
  // Convert segments to display items (sorted oldest-first)
  const items = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    const segmentMap = new Map(segments.map(s => [s.id, s]));
    
    const displayItems = sorted.map(segment => 
      segmentToDisplayItem(segment, segmentMap, groups)
    );
    
    // Add end marker if we have data
    if (sorted.length > 0) {
      const lastSegment = sorted[sorted.length - 1];
      displayItems.push({
        id: 'workout-end',
        parentId: null,
        fragments: [{
          type: 'end',
          fragmentType: FragmentType.Action,
          value: 'end',
          image: 'End'
        }, {
          type: 'timer',
          fragmentType: FragmentType.Timer,
          value: lastSegment.endTime,
          image: formatTimestamp(lastSegment.endTime)
        }],
        depth: 0,
        isHeader: true,
        status: 'completed',
        sourceType: 'record',
        sourceId: 'end',
        startTime: lastSegment.endTime
      });
    }
    
    return displayItems;
  }, [segments, groups]);

  // Convert selected IDs to string set
  const selectedIds = useMemo(() => 
    new Set(Array.from(selectedSegmentIds).map(String)),
    [selectedSegmentIds]
  );

  // Handle selection
  const handleSelectionChange = useCallback((id: string | null) => {
    if (id && id !== 'workout-end') {
      onSelectSegment?.(parseInt(id, 10));
    }
  }, [onSelectSegment]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Always show on mobile */}
      {mobile && (
        <div className="p-4 border-b border-border bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold">Analytics Index</h3>
        </div>
      )}
      
      {/* Unified Item List */}
      <UnifiedItemList
        items={items}
        selectedIds={selectedIds}
        compact={!mobile}
        showDurations
        autoScroll={false}
        groupLinked={false}
        onSelectionChange={onSelectSegment ? handleSelectionChange : undefined}
        className="flex-1"
        emptyMessage="No historical data available"
      />

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
