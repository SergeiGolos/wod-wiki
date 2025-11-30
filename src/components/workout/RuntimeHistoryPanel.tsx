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
import { MetricsTreeView, MetricItem } from '../metrics/MetricsTreeView';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';
import { MemoryTypeEnum } from '../../runtime/MemoryTypeEnum';
import { hashCode } from '../../lib/utils';
import { Clock, Play, Activity, Pause } from 'lucide-react';

export interface RuntimeHistoryPanelProps {
  /** Active runtime for live tracking */
  runtime: ScriptRuntime | null;
  
  /** Currently active segment IDs (blocks on stack) */
  activeSegmentIds?: Set<number>;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Helper to create tags for the card
 */
const createTags = (type: string, label: string, duration?: number) => {
  return (
    <div className="flex flex-wrap gap-1 gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-opacity-60 shadow-sm cursor-help transition-colors hover:bg-opacity-80 
        ${type === 'work' ? 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100' : 
          type === 'rest' ? 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100' :
          'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100'}`}>
        <span className="text-base leading-none">
          {type === 'work' ? '💪' : type === 'rest' ? '⏸️' : '⏱️'}
        </span>
        <span>{label}</span>
      </span>
      {duration !== undefined && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 bg-opacity-60 shadow-sm">
          <span>{Math.floor(duration)}s</span>
        </span>
      )}
    </div>
  );
};

/**
 * Convert ExecutionRecord to MetricItem
 */
function recordToItem(record: ExecutionRecord): MetricItem {
  const duration = ((record.endTime ?? Date.now()) - record.startTime) / 1000;
  const type = record.type.toLowerCase();
  
  return {
    id: hashCode(record.blockId).toString(),
    parentId: record.parentId ? hashCode(record.parentId).toString() : null,
    lane: 0, // Will be calculated later
    title: record.label,
    startTime: record.startTime,
    icon: type === 'work' ? <Activity className="h-3 w-3 text-red-500" /> :
          type === 'rest' ? <Pause className="h-3 w-3 text-green-500" /> :
          <Clock className="h-3 w-3 text-blue-500" />,
    tags: createTags(type, record.label, duration),
    footer: <span className="font-mono text-muted-foreground">{Math.floor(duration)}s</span>,
    status: 'completed'
  };
}

/**
 * RuntimeHistoryPanel Component
 */
export const RuntimeHistoryPanel: React.FC<RuntimeHistoryPanelProps> = ({
  runtime,
  activeSegmentIds = new Set(),
  autoScroll = true,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build items in NEWEST-FIRST order
  const items = React.useMemo(() => {
    if (!runtime) {
      return [];
    }

    // 1. Get completed items from execution log
    const historyItems: MetricItem[] = runtime.executionLog.map(recordToItem);

    // 2. Get active items from stack
    const activeItems: MetricItem[] = runtime.stack.blocks.map((block, stackIndex) => {
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

      const duration = (Date.now() - startTime) / 1000;
      const type = (block.blockType || 'unknown').toLowerCase();

      return {
        id: hashCode(block.key.toString()).toString(),
        parentId: parentId ? hashCode(parentId).toString() : null,
        lane: stackIndex, // Initial lane guess
        title: block.label || block.blockType || 'Block',
        startTime: startTime,
        icon: <Play className="h-3 w-3 text-primary animate-pulse" />,
        tags: createTags(type, block.label || 'Active'),
        footer: <span className="font-mono text-muted-foreground">{Math.floor(duration)}s</span>,
        status: 'active'
      };
    });

    // Combine and sort NEWEST-FIRST
    const allItems = [...historyItems, ...activeItems]
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0)); // Reverse chronological
    
    // Calculate lanes/indentation based on parent-child relationships
    // Since we are reverse chronological, children appear BEFORE parents usually.
    // We need to map IDs to find depths.
    
    const idToDepth = new Map<string, number>();
    
    // We need to process from oldest to newest to establish depth
    const chronological = [...allItems].reverse();
    
    chronological.forEach(item => {
      let depth = 0;
      if (item.parentId && idToDepth.has(item.parentId)) {
        depth = (idToDepth.get(item.parentId) || 0) + 1;
      }
      idToDepth.set(item.id, depth);
      item.lane = depth;
    });

    return allItems;
  }, [runtime]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tree View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            Waiting for workout to start...
          </div>
        ) : (
          <MetricsTreeView 
            items={items}
            selectedIds={new Set(Array.from(activeSegmentIds).map(String))}
            onSelect={() => {}} // Read-only
            autoScroll={autoScroll}
          />
        )}
      </div>
    </div>
  );
};
