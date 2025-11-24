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
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';

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
 * Helper to convert ExecutionRecord to Segment for display
 */
function recordToSegment(record: ExecutionRecord, hashCode: (str: string) => number): Segment {
  return {
    id: hashCode(record.blockId),
    name: record.label,
    type: record.type.toLowerCase(),
    startTime: Math.floor(record.startTime / 1000),
    endTime: Math.floor((record.endTime ?? Date.now()) / 1000),
    duration: ((record.endTime ?? Date.now()) - record.startTime) / 1000,
    parentId: record.parentId ? hashCode(record.parentId) : null,
    depth: 0,
    avgPower: 0,
    avgHr: 0,
    lane: 0
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
  // Build segments from runtime memory if available
  const segments = React.useMemo(() => {
    if (historicalSegments.length > 0) {
      return historicalSegments;
    }

    if (!runtime) {
      return [];
    }

    // 1. Get completed segments from execution log
    const historySegments: Segment[] = runtime.executionLog.map(record => 
      recordToSegment(record, hashCode)
    );

    // 2. Get active segments from stack
    const activeSegments: Segment[] = runtime.stack.blocks.map((block, stackIndex) => {
      let startTime = Date.now();
      
      // Try to get start time from memory
      const startTimeRefs = runtime.memory.search({ 
        type: 'metric-start-time', 
        ownerId: block.key.toString(),
        id: null,
        visibility: null
      });
      
      if (startTimeRefs.length > 0) {
        const storedStartTime = runtime.memory.get(startTimeRefs[0] as any) as number;
        if (storedStartTime) {
          startTime = storedStartTime;
        }
      }

      const parentId = stackIndex > 0 
        ? runtime.stack.blocks[stackIndex - 1].key.toString() 
        : null;

      return {
        id: hashCode(block.key.toString()),
        name: block.blockType || block.key.toString(),
        type: (block.blockType || 'unknown').toLowerCase(),
        startTime: Math.floor(startTime / 1000),
        endTime: Math.floor(Date.now() / 1000),
        duration: (Date.now() - startTime) / 1000,
        parentId: parentId ? hashCode(parentId) : null,
        depth: stackIndex,
        avgPower: 0,
        avgHr: 0,
        lane: 0
      };
    });

    // Combine and normalize times
    const allSegments = [...historySegments, ...activeSegments]
      .sort((a, b) => a.startTime - b.startTime);
    
    if (allSegments.length > 0) {
      const minStartTime = allSegments[0].startTime;
      allSegments.forEach(s => {
        s.startTime -= minStartTime;
        s.endTime -= minStartTime;
      });
    }

    return allSegments;
  }, [runtime, historicalSegments]);

  const selectedIds = React.useMemo(() => {
    return new Set(activeSegmentId ? [activeSegmentId] : []);
  }, [activeSegmentId]);

  return (
    <GitTreeSidebar 
      segments={segments}
      selectedIds={selectedIds}
      onSelect={() => {}} // No selection in this mode
      disableScroll={disableScroll}
      hideHeader={true}
      scrollContainerRef={scrollRef}
    >
      {children}
    </GitTreeSidebar>
  );
};
