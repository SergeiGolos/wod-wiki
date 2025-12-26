/**
 * ExecutionLogPanel - Displays execution history in Git-tree format
 * 
 * Supports two modes:
 * 1. Live Mode - Shows active execution with growing log from RuntimeMemory
 * 2. Historical Mode - Shows completed execution from MetricsRepository
 */

import React from 'react';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { RuntimeSpan } from '../../runtime/models/RuntimeSpan';
import { fragmentsToLabel } from '../../runtime/utils/metricsToFragments';

import { useTrackedSpans, useSpanHierarchy } from '../../clock/hooks/useExecutionSpans';

export interface ExecutionLogPanelProps {
  /** Active runtime for live mode (null for historical mode) */
  runtime: ScriptRuntime | null;

  /** Historical segments for analysis mode */
  historicalSegments?: Segment[];

  /** Currently active segment ID */
  activeSegmentId?: number | null;

  /** Whether to disable auto-scroll */
  disableScroll?: boolean;

  /** Ref to scroll container */
  scrollRef?: React.RefObject<HTMLDivElement>;

  /** Children to render below the tree (e.g., "feeding" connector) */
  children?: React.ReactNode;
}

/**
 * Helper to convert TrackedSpan to Segment for display
 */
function recordToSegment(
  record: RuntimeSpan,
  hashCode: (str: string) => number,
  depthMap: Map<string, number>
): Segment {
  const depth = depthMap.get(record.id) || 0;
  const label = fragmentsToLabel(record.fragments);

  const nameFragment = record.fragments.flat().find(f =>
    f.fragmentType === 'effort' ||
    f.fragmentType === 'action' ||
    f.fragmentType === 'timer' ||
    f.fragmentType === 'rounds'
  );
  const type = nameFragment?.type || 'group';

  const parentId = record.parentSpanId;
  const duration = record.total() / 1000;

  return {
    id: hashCode(record.blockId),
    name: label,
    type: type,
    startTime: Math.floor(record.startTime / 1000),
    endTime: Math.floor((record.endTime ?? Date.now()) / 1000),
    duration: duration,
    parentId: parentId ? hashCode(parentId) : null,
    depth: depth,
    avgPower: 0,
    avgHr: 0,
    lane: depth
  };
}

/**
 * Hash function for generating stable IDs
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Main execution log panel component
 */
export const ExecutionLogPanel: React.FC<ExecutionLogPanelProps> = ({
  runtime,
  historicalSegments = [],
  activeSegmentId = null,
  disableScroll = false,
  scrollRef,
  children
}) => {
  const { active, completed, runtimeSpans } = useTrackedSpans(runtime);
  const depthMap = useSpanHierarchy(runtime);

  // Build segments from runtime memory if available
  const segments = React.useMemo(() => {
    if (historicalSegments.length > 0) {
      return historicalSegments;
    }

    if (!runtime) {
      return [];
    }

    const allSpans = runtimeSpans;

    // Convert all spans (completed + active) to Segments
    const allSegments = allSpans.map(span =>
      recordToSegment(span, hashCode, depthMap)
    ).sort((a, b) => a.startTime - b.startTime);

    if (allSegments.length > 0) {
      const minStartTime = allSegments[0].startTime;
      allSegments.forEach(s => {
        s.startTime -= minStartTime;
        s.endTime -= minStartTime;
      });
    }

    return allSegments;
  }, [runtime, historicalSegments, active, completed, runtimeSpans, depthMap]);

  const selectedIds = React.useMemo(() => {
    return new Set(activeSegmentId ? [activeSegmentId] : []);
  }, [activeSegmentId]);

  return (
    <GitTreeSidebar
      segments={segments}
      selectedIds={selectedIds}
      onSelect={() => { }} // No selection in this mode
      disableScroll={disableScroll}
      hideHeader={true}
      scrollContainerRef={scrollRef}
    >
      {children}
    </GitTreeSidebar>
  );
};
