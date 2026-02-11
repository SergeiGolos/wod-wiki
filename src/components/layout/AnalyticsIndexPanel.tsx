/**
 * AnalyticsIndexPanel - Segment selection for Analyze view
 * 
 * Key Features:
 * - Oldest-first, newest-last ordering (chronological)
 * - Clickable segments for filtering analytics
 * - Uses IFragmentSource directly — no IDisplayItem adapter layer
 * - Read-only historical data with power/HR metrics
 *
 * @see docs/FragmentOverhaul.md - Phase 5
 */

import React, { useMemo, useCallback } from 'react';
import { FragmentSourceList } from '../fragments/FragmentSourceList';
import { FragmentSourceEntry, FragmentSourceStatus } from '../fragments/FragmentSourceRow';
import { cn } from '../../lib/utils';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { AnalyticsGroup, Segment } from '../../core/models/AnalyticsModels';
import { SimpleFragmentSource } from '../../core/utils/SimpleFragmentSource';
import { usePanelSize } from './panel-system/PanelSizeContext';

export interface AnalyticsIndexPanelProps {
  /** Historical segments to display */
  segments: Segment[];

  /** Available metric groups for display configuration */
  groups?: AnalyticsGroup[];

  /** Currently selected segment IDs for filtering */
  selectedSegmentIds?: Set<number>;

  /** Callback when segment is clicked */
  onSelectSegment?: (segmentId: number) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Format elapsed time (in seconds) to MM:SS or HH:MM:SS
 */
function formatElapsedTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  if (segment.fragments && segment.fragments.length > 0) {
    return segment.fragments;
  }

  const fragments: ICodeFragment[] = [];

  // Add type fragment
  fragments.push({
    type: segment.type,
    fragmentType: getFragmentTypeFromSegmentType(segment.type),
    value: segment.type,
    image: segment.type,
  });

  // Add Start Time as timer fragment (startTime is in seconds from workout start)
  fragments.push({
    type: 'timer',
    fragmentType: FragmentType.Timer,
    value: segment.startTime,
    image: formatElapsedTime(segment.startTime),
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
        switch (key) {
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
 * Convert segment to FragmentSourceEntry for unified visualization.
 */
function segmentToEntry(
  segment: Segment,
  allSegments: Map<number, Segment>,
  groups: AnalyticsGroup[]
): FragmentSourceEntry {
  const type = segment.type.toLowerCase();

  // Use depth directly if available, otherwise calculate
  let depth = segment.depth || 0;
  if (depth === 0 && segment.parentId !== null) {
    let currentParentId: number | null | undefined = segment.parentId;
    const visited = new Set<number>();
    visited.add(segment.id);

    while (currentParentId !== null && currentParentId !== undefined && !visited.has(currentParentId)) {
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
    source: new SimpleFragmentSource(segment.id, fragments),
    depth,
    isHeader,
    status: 'completed' as FragmentSourceStatus,
    duration: segment.duration * 1000,
    startTime: segment.startTime * 1000,
    endTime: segment.endTime * 1000,
    label: segment.name,
  };
}

/**
 * AnalyticsIndexPanel Component - Uses IFragmentSource directly
 */
export const AnalyticsIndexPanel: React.FC<AnalyticsIndexPanelProps> = ({
  segments,
  selectedSegmentIds = new Set(),
  onSelectSegment,
  groups = [],
  className = ''
}) => {
  const { isCompact: mobile } = usePanelSize();

  // Convert segments to FragmentSourceEntry[] (sorted oldest-first)
  const entries = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    const segmentMap = new Map(segments.map(s => [s.id, s]));

    const displayEntries = sorted.map(segment =>
      segmentToEntry(segment, segmentMap, groups)
    );

    // Add end marker if we have data
    if (sorted.length > 0) {
      const lastSegment = sorted[sorted.length - 1];
      displayEntries.push({
        source: new SimpleFragmentSource('workout-end', [
          {
            type: 'end',
            fragmentType: FragmentType.Action,
            value: 'end',
            image: 'End'
          },
          {
            type: 'timer',
            fragmentType: FragmentType.Timer,
            value: lastSegment.endTime,
            image: formatElapsedTime(lastSegment.endTime)
          }
        ]),
        depth: 0,
        isHeader: true,
        status: 'completed' as FragmentSourceStatus,
        startTime: lastSegment.endTime * 1000,
      });
    }

    return displayEntries;
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

      {/* Fragment Source List */}
      <FragmentSourceList
        entries={entries}
        selectedIds={selectedIds}
        size={mobile ? 'normal' : 'compact'}
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
