/**
 * TimerIndexPanel - Live execution history for Track view
 * 
 * Renamed from RuntimeHistoryPanel to follow the *IndexPanel naming convention.
 * 
 * Key Features:
 * - Newest-first, oldest-last ordering
 * - Grows downward as workout progresses
 * - Read-only with active context highlighting
 * - Shows which blocks are currently on the stack
 * - Uses FragmentVisualizer for consistent card display matching EditorIndexPanel
 */

import React, { useRef, useEffect } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { MemoryTypeEnum } from '../../runtime/MemoryTypeEnum';
import { cn } from '../../lib/utils';
import { WodBlock } from '../../markdown-editor/types';
import { WorkoutContextPanel } from '../workout/WorkoutContextPanel';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricValue, RuntimeMetric } from '../../runtime/RuntimeMetric';
import { Play, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export interface TimerIndexPanelProps {
  /** Active runtime for live tracking */
  runtime: ScriptRuntime | null;
  
  /** Active workout block (for context display) */
  activeBlock?: WodBlock | null;
  
  /** Currently active segment IDs (blocks on stack) */
  activeSegmentIds?: Set<number>;
  
  /** Currently active statement IDs */
  activeStatementIds?: Set<number>;
  
  /** Whether to auto-scroll to newest entries */
  autoScroll?: boolean;
  
  /** Whether to render in mobile mode */
  mobile?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Children to render (e.g., connector visuals) */
  children?: React.ReactNode;
  
  /** Workout start time (timestamp when execution began) */
  workoutStartTime?: number | null;
}

/**
 * Represents a display entry in the execution history
 */
interface ExecutionEntry {
  id: string;
  label: string;
  type: string;
  status: 'active' | 'completed' | 'failed' | 'start';
  startTime: number;
  endTime?: number;
  depth: number;
  fragments: ICodeFragment[];
  parentId: string | null;
}

/**
 * Convert MetricValue to ICodeFragment for display
 */
function metricToFragment(metric: MetricValue): ICodeFragment {
  const typeMapping: Record<string, FragmentType> = {
    'repetitions': FragmentType.Rep,
    'resistance': FragmentType.Resistance,
    'distance': FragmentType.Distance,
    'timestamp': FragmentType.Timer,
    'rounds': FragmentType.Rounds,
    'time': FragmentType.Timer,
    'calories': FragmentType.Distance, // No direct mapping, use distance
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
 * Convert RuntimeMetric array to ICodeFragment array
 */
function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  
  for (const metric of metrics) {
    // Add effort fragment if exerciseId is present
    if (metric.exerciseId) {
      fragments.push({
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: metric.exerciseId,
        image: metric.exerciseId,
      });
    }
    
    // Add value fragments
    for (const value of metric.values) {
      fragments.push(metricToFragment(value));
    }
  }
  
  return fragments;
}

/**
 * Create a label fragment from block type/label
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
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Single execution entry card component - Compact version
 */
const ExecutionEntryCard: React.FC<{
  entry: ExecutionEntry;
  isActive: boolean;
  mobile: boolean;
}> = ({ entry, isActive, mobile }) => {
  const StatusIcon = {
    'start': Play,
    'active': Clock,
    'completed': CheckCircle2,
    'failed': AlertCircle,
  }[entry.status];
  
  const statusColorClass = {
    'start': 'text-primary',
    'active': 'text-blue-500 animate-pulse',
    'completed': 'text-green-500',
    'failed': 'text-red-500',
  }[entry.status];
  
  const borderClass = isActive 
    ? 'border-primary bg-primary/5' 
    : 'border-transparent hover:border-border hover:bg-muted/30';
  
  const duration = entry.endTime 
    ? formatDuration(entry.endTime - entry.startTime)
    : formatDuration(Date.now() - entry.startTime);
  
  return (
    <div
      className={cn(
        'rounded border transition-all flex items-center gap-2',
        borderClass,
        mobile ? 'py-1.5 px-2' : 'py-1 px-1.5',
      )}
      style={{ marginLeft: `${entry.depth * 8}px` }}
    >
      {/* Status Icon */}
      <StatusIcon className={cn('flex-shrink-0', statusColorClass, mobile ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
      
      {/* Label */}
      <span className={cn(
        'truncate flex-shrink-0 max-w-[100px]',
        mobile ? 'text-xs' : 'text-[11px]',
        entry.status === 'completed' && 'text-muted-foreground'
      )}>
        {entry.label}
      </span>
      
      {/* Fragments - inline */}
      {entry.fragments.length > 0 && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <FragmentVisualizer 
            fragments={entry.fragments} 
            className="gap-0.5"
          />
        </div>
      )}
      
      {/* Duration badge */}
      <span className={cn(
        'flex-shrink-0 text-[9px] font-mono text-muted-foreground',
      )}>
        {duration}
      </span>
    </div>
  );
};

/**
 * TimerIndexPanel Component
 */
export const TimerIndexPanel: React.FC<TimerIndexPanelProps> = ({
  runtime,
  activeBlock,
  activeStatementIds = new Set(),
  autoScroll = true,
  mobile = false,
  className = '',
  children,
  workoutStartTime
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build execution entries from runtime state
  const entries = React.useMemo((): ExecutionEntry[] => {
    if (!runtime) {
      return [];
    }

    const allEntries: ExecutionEntry[] = [];
    
    // 1. Add "Start" entry if workout has started (runtime has started executing)
    const hasStarted = runtime.executionLog.length > 0 || runtime.stack.blocks.length > 0;
    
    if (hasStarted) {
      // Determine actual start time from earliest record or provided time
      let startTimestamp = workoutStartTime || Date.now();
      
      if (runtime.executionLog.length > 0) {
        const earliestRecord = runtime.executionLog.reduce(
          (earliest, record) => record.startTime < earliest.startTime ? record : earliest,
          runtime.executionLog[0]
        );
        startTimestamp = Math.min(startTimestamp, earliestRecord.startTime);
      }
      
      allEntries.push({
        id: 'workout-start',
        label: 'Workout Started',
        type: 'start',
        status: 'start',
        startTime: startTimestamp,
        endTime: startTimestamp,
        depth: 0,
        fragments: [{
          type: 'timer',
          fragmentType: FragmentType.Timer,
          value: startTimestamp,
          image: formatTimestamp(startTimestamp),
        }],
        parentId: null,
      });
    }

    // 2. Add completed entries from execution log
    for (const record of runtime.executionLog) {
      const fragments = record.metrics.length > 0 
        ? metricsToFragments(record.metrics)
        : [createLabelFragment(record.label, record.type)];
      
      allEntries.push({
        id: record.id,
        label: record.label,
        type: record.type,
        status: record.status === 'failed' ? 'failed' : 'completed',
        startTime: record.startTime,
        endTime: record.endTime,
        depth: 0, // Will be calculated from parentId later
        fragments,
        parentId: record.parentId,
      });
    }

    // 3. Add active entries from stack (only if actually executing)
    for (let i = 0; i < runtime.stack.blocks.length; i++) {
      const block = runtime.stack.blocks[i];
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

      const parentId = i > 0 
        ? runtime.stack.blocks[i - 1].key.toString() 
        : null;

      allEntries.push({
        id: block.key.toString(),
        label: block.label || block.blockType || 'Block',
        type: block.blockType || 'unknown',
        status: 'active',
        startTime,
        depth: i,
        fragments: [createLabelFragment(block.label || block.blockType || 'Block', block.blockType || 'unknown')],
        parentId,
      });
    }

    // Sort by start time (oldest first for display order)
    allEntries.sort((a, b) => a.startTime - b.startTime);
    
    // Calculate depths based on parentId relationships
    const idToDepth = new Map<string, number>();
    for (const entry of allEntries) {
      if (entry.parentId && idToDepth.has(entry.parentId)) {
        entry.depth = (idToDepth.get(entry.parentId) || 0) + 1;
      } else if (entry.id !== 'workout-start') {
        entry.depth = 0;
      }
      idToDepth.set(entry.id, entry.depth);
    }

    return allEntries;
  }, [runtime, workoutStartTime]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, autoScroll]);

  // Determine which entries are "active" based on activeSegmentIds
  const activeIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (runtime) {
      for (const block of runtime.stack.blocks) {
        ids.add(block.key.toString());
      }
    }
    return ids;
  }, [runtime]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - Mobile style includes title */}
      {mobile && (
        <div className="p-4 border-b border-border bg-muted/30 shrink-0">
          <h3 className="text-sm font-semibold">Timer Index</h3>
        </div>
      )}
      
      {/* Active Context (if block provided) */}
      {activeBlock && (
        <WorkoutContextPanel
          block={activeBlock}
          mode="run"
          activeStatementIds={activeStatementIds}
          className="shrink-0 border-b border-border"
        />
      )}

      {/* Execution History */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            Waiting for workout to start...
          </div>
        ) : (
          <div className={cn('space-y-0.5', mobile ? 'p-2' : 'p-1')}>
            {entries.map((entry) => (
              <ExecutionEntryCard
                key={entry.id}
                entry={entry}
                isActive={activeIds.has(entry.id)}
                mobile={mobile}
              />
            ))}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerIndexPanel;
