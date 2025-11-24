/**
 * RuntimeHistoryPanel - Live execution history for Track screen
 * 
 * Key Features:
 * - Newest-first, oldest-last ordering
 * - Grows downward as workout progresses
 * - Always starts with a "Start" card marking workout timestamp
 * - Read-only with active context highlighting
 * - Cards written AFTER blocks report themselves (lazy rendering)
 * - Shows which blocks are currently on the stack
 */

import React, { useRef, useEffect } from 'react';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';
import { MemoryTypeEnum } from '../../runtime/MemoryTypeEnum';

export interface RuntimeHistoryPanelProps {
  /** Active runtime for live tracking */
  runtime: ScriptRuntime | null;
  
  /** Currently active segment IDs (blocks on stack) */
  activeSegmentIds?: Set<number>;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Children to render (e.g., connector visuals) */
  children?: React.ReactNode;
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
 * Convert ExecutionRecord to Segment
 */
function recordToSegment(record: ExecutionRecord): Segment {
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
 * RuntimeHistoryPanel Component
 */
export const RuntimeHistoryPanel: React.FC<RuntimeHistoryPanelProps> = ({
  runtime,
  activeSegmentIds = new Set(),
  autoScroll = true,
  className = '',
  children
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build segments in NEWEST-FIRST order
  const segments = React.useMemo(() => {
    if (!runtime) {
      return [];
    }

    // 1. Get completed segments from execution log
    const historySegments: Segment[] = runtime.executionLog.map(recordToSegment);

    // 2. Get active segments from stack
    const activeSegments: Segment[] = runtime.stack.blocks.map((block, stackIndex) => {
      let startTime = Date.now();
      
      // Try to get start time from memory
      const startTimeRefs = runtime.memory.search({ 
        type: MemoryTypeEnum.METRIC_START_TIME, 
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
        name: block.label || block.blockType || 'Block',
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

    // Combine and sort NEWEST-FIRST
    const allSegments = [...historySegments, ...activeSegments]
      .sort((a, b) => b.startTime - a.startTime); // Reverse chronological
    
    // Normalize times relative to first (oldest) segment
    if (allSegments.length > 0) {
      const minStartTime = Math.min(...allSegments.map(s => s.startTime));
      allSegments.forEach(s => {
        s.startTime -= minStartTime;
        s.endTime -= minStartTime;
      });
    }

    return allSegments;
  }, [runtime]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments.length, autoScroll]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
        {segments.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            Waiting for workout to start...
          </div>
        ) : (
          <GitTreeSidebar 
            segments={segments}
            selectedIds={activeSegmentIds}
            onSelect={() => {}} // Read-only
            disableScroll={true}
            hideHeader={true}
          >
            {children}
          </GitTreeSidebar>
        )}
      </div>
    </div>
  );
};
