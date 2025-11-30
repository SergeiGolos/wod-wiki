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
 * - Displays metrics as fragments (effort name, reps, etc.)
 */

import React, { useRef, useEffect } from 'react';
import { MetricsTreeView, MetricItem } from '../metrics/MetricsTreeView';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';
import { hashCode } from '../../lib/utils';
import { Clock, Play, Activity, Pause } from 'lucide-react';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricValue, RuntimeMetric } from '../../runtime/RuntimeMetric';

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

// --- Helper Functions for Metrics to Fragments Conversion ---

/**
 * Convert a single MetricValue to an ICodeFragment for display
 */
function metricToFragment(metric: MetricValue): ICodeFragment {
  const typeMapping: Record<string, FragmentType> = {
    'repetitions': FragmentType.Rep,
    'resistance': FragmentType.Resistance,
    'distance': FragmentType.Distance,
    'timestamp': FragmentType.Timer,
    'rounds': FragmentType.Rounds,
    'time': FragmentType.Timer,
    'calories': FragmentType.Distance,
    'action': FragmentType.Action,
    'effort': FragmentType.Effort,
  };
  
  const fragmentType = typeMapping[metric.type] || FragmentType.Text;
  const displayValue = metric.value !== undefined 
    ? `${metric.value}${metric.unit ? ' ' + metric.unit : ''}`
    : metric.unit;
  
  return {
    type: metric.type,
    fragmentType,
    value: metric.value,
    image: displayValue,
  };
}

/**
 * Convert RuntimeMetric array to ICodeFragment array for FragmentVisualizer
 */
function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  for (const metric of metrics) {
    // Add exercise name as effort fragment
    if (metric.exerciseId) {
      fragments.push({
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: metric.exerciseId,
        image: metric.exerciseId,
      });
    }
    // Add each metric value as a fragment
    for (const value of metric.values) {
      fragments.push(metricToFragment(value));
    }
  }
  return fragments;
}

/**
 * Create a label fragment when no metrics are available
 */
function createLabelFragment(label: string, type: string): ICodeFragment {
  const typeMapping: Record<string, FragmentType> = {
    'timer': FragmentType.Timer,
    'rounds': FragmentType.Rounds,
    'effort': FragmentType.Effort,
    'group': FragmentType.Action,
  };
  
  return {
    type: type.toLowerCase(),
    fragmentType: typeMapping[type.toLowerCase()] || FragmentType.Text,
    value: label,
    image: label,
  };
}

/**
 * Helper to create tags for the card using FragmentVisualizer
 */
const createTags = (fragments: ICodeFragment[], duration?: number) => {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <FragmentVisualizer fragments={fragments} className="gap-1" compact />
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
  
  // Convert metrics to fragments, fallback to label fragment if no metrics
  const fragments = record.metrics && record.metrics.length > 0 
    ? metricsToFragments(record.metrics)
    : [createLabelFragment(record.label, record.type)];
  
  return {
    id: hashCode(record.blockId).toString(),
    parentId: record.parentId ? hashCode(record.parentId).toString() : null,
    lane: 0, // Will be calculated later
    title: record.label,
    startTime: record.startTime,
    icon: type === 'work' ? <Activity className="h-3 w-3 text-red-500" /> :
          type === 'rest' ? <Pause className="h-3 w-3 text-green-500" /> :
          <Clock className="h-3 w-3 text-blue-500" />,
    tags: createTags(fragments, duration),
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

    // 2. Get active items from activeSpans (contains metrics)
    const activeItems: MetricItem[] = [];
    runtime.activeSpans.forEach((record) => {
      const duration = (Date.now() - record.startTime) / 1000;
      
      // Convert metrics to fragments, fallback to label fragment if no metrics
      const fragments = record.metrics && record.metrics.length > 0 
        ? metricsToFragments(record.metrics)
        : [createLabelFragment(record.label, record.type)];
      
      activeItems.push({
        id: hashCode(record.blockId).toString(),
        parentId: record.parentId ? hashCode(record.parentId).toString() : null,
        lane: 0, // Will be calculated later
        title: record.label,
        startTime: record.startTime,
        icon: <Play className="h-3 w-3 text-primary animate-pulse" />,
        tags: createTags(fragments),
        footer: <span className="font-mono text-muted-foreground">{Math.floor(duration)}s</span>,
        status: 'active'
      });
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
