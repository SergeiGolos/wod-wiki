import React, { useMemo, useEffect, useRef } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';

import { cn } from '../../lib/utils';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricValue, RuntimeMetric } from '../../runtime/RuntimeMetric';
import { WodBlock } from '../../markdown-editor/types';
import { WorkoutContextPanel } from '../workout/WorkoutContextPanel';

export interface RuntimeEventLogProps {
  runtime: ScriptRuntime | null;
  activeBlock?: WodBlock | null;
  activeStatementIds?: Set<number>;
  highlightedBlockKey?: string | null;
  autoScroll?: boolean;
  mobile?: boolean;
  className?: string;
  workoutStartTime?: number | null;
}

interface LogEntry {
  id: string;
  label: string;
  type: string;
  status: 'active' | 'completed' | 'failed' | 'start';
  startTime: number;
  endTime?: number;
  fragments: ICodeFragment[];
  parentId: string | null;
  depth: number;
}

interface LogSection {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  entries: LogEntry[];
  isActive: boolean;
  type: string;
}

// --- Helper Functions ---

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

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

function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  for (const metric of metrics) {
    if (metric.exerciseId) {
      fragments.push({
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: metric.exerciseId,
        image: metric.exerciseId,
      });
    }
    for (const value of metric.values) {
      fragments.push(metricToFragment(value));
    }
  }
  return fragments;
}

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

export const RuntimeEventLog: React.FC<RuntimeEventLogProps> = ({
  runtime,
  activeBlock,
  activeStatementIds = new Set(),
  highlightedBlockKey,
  autoScroll = true,
  mobile = false,
  className = '',
  workoutStartTime
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [updateVersion, setUpdateVersion] = React.useState(0);

  // Subscribe to runtime updates
  useEffect(() => {
    if (!runtime) return;
    const unsubscribe = runtime.memory.subscribe(() => setUpdateVersion(v => v + 1));
    const intervalId = setInterval(() => setUpdateVersion(v => v + 1), 100);
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [runtime]);

  // Transform runtime data into sections and entries
  const useMemoResult = useMemo(() => {
    void updateVersion; // Dependency
    if (!runtime) return { sections: [], activeLeafId: null };

    const allEntries: LogEntry[] = [];
    
    // 1. Start Entry - only add if there's actual workout content (not just idle blocks)
    // Filter out idle blocks from the check - we want to show "Workout Started" only when
    // actual workout content has begun, not when we're in the initial "Ready" idle state
    const nonIdleExecutionLog = runtime.executionLog.filter(r => r.type.toLowerCase() !== 'idle');
    const nonIdleActiveSpans = Array.from(runtime.activeSpans.values()).filter(r => r.type.toLowerCase() !== 'idle');
    const hasStarted = nonIdleExecutionLog.length > 0 || nonIdleActiveSpans.length > 0;
    
    if (hasStarted) {
      let startTimestamp = workoutStartTime || Date.now();
      if (nonIdleExecutionLog.length > 0) {
        const earliest = nonIdleExecutionLog.reduce((a, b) => a.startTime < b.startTime ? a : b);
        startTimestamp = Math.min(startTimestamp, earliest.startTime);
      } else if (nonIdleActiveSpans.length > 0) {
        const earliest = nonIdleActiveSpans.reduce((a, b) => a.startTime < b.startTime ? a : b);
        startTimestamp = Math.min(startTimestamp, earliest.startTime);
      }
      allEntries.push({
        id: 'workout-start',
        label: 'Workout Started',
        type: 'start',
        status: 'start',
        startTime: startTimestamp,
        endTime: startTimestamp,
        fragments: [{
          type: 'timer',
          fragmentType: FragmentType.Timer,
          value: startTimestamp,
          image: formatTimestamp(startTimestamp),
        }],
        parentId: null,
        depth: 0
      });
    }

    // 2. Completed Entries (filter out idle blocks - they're internal state, not user-facing)
    runtime.executionLog
      .filter(record => record.type.toLowerCase() !== 'idle')
      .forEach(record => {
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
        fragments,
        parentId: record.parentId,
        depth: 0
      });
    });

    // 3. Active Entries (from activeSpans)
    // This includes both stack blocks AND auxiliary records (like Rounds/Intervals)
    // Filter out idle blocks - they're internal state, not user-facing
    const activeSpans = runtime.activeSpans; // Map<string, ExecutionRecord>
    
    activeSpans.forEach(record => {
       // Skip idle blocks in the display
       if (record.type.toLowerCase() === 'idle') return;
       
       const fragments = record.metrics.length > 0 
        ? metricsToFragments(record.metrics)
        : [createLabelFragment(record.label, record.type)];

       allEntries.push({
        id: record.id,
        label: record.label,
        type: record.type,
        status: 'active',
        startTime: record.startTime,
        endTime: undefined,
        fragments,
        parentId: record.parentId,
        depth: 0
      });
    });

    allEntries.sort((a, b) => a.startTime - b.startTime);

    // Identify the "Active Leaf" (the one that should be highlighted)
    // It's usually the last active entry that is NOT a container
    // Or simply the last active entry in time
    let activeLeafId: string | null = null;
    
    // Find last active entry
    const activeEntries = allEntries.filter(e => e.status === 'active');
    if (activeEntries.length > 0) {
        // The one with the latest start time is likely the leaf
        // But we should exclude containers if possible? 
        // Actually, if we are in a container (e.g. "Rest"), it is the leaf.
        // If we are in "Round 1", it is a container, but if it's the only thing active...
        // Usually the stack has [Rounds, Round1, Effort]. All active.
        // Effort is the latest.
        activeLeafId = activeEntries[activeEntries.length - 1].id;
    }

    // Group into sections
    // A section is defined by a parent node (Round, Interval, etc.)
    // Root level nodes also form sections if they are containers
    // Leaf nodes go into the current section
    
    const resultSections: LogSection[] = [];
    
    // Map of BlockID -> List of Sections created for that block (ordered by time)
    const sectionsByBlockId = new Map<string, LogSection[]>();

    // Helper to add section
    const addSection = (section: LogSection) => {
        resultSections.push(section);
        
        // Track sections by their original ID (if it matches a block ID)
        // But wait, the section ID for a round is "blockId-round-N"
        // The parentId of children is "blockId"
        // So we need to map "blockId" -> [Section(Round1), Section(Round2)]
        
        // If this section IS a round/interval record, it has a parentId pointing to the block
        if (section.type === 'round' || section.type === 'interval') {
             // It's a sub-section of the block defined by section.entries[0]?.parentId? 
             // No, the section itself corresponds to an entry.
             // The entry for "Round 1" has parentId = "LoopBlockId".
             // So we should map LoopBlockId -> [Round1Section, Round2Section]
             
             // We need to find the entry that created this section to know its parentId
             // But we don't have easy access here.
             // However, we know the entry ID is section.id.
             const entry = allEntries.find(e => e.id === section.id);
             if (entry && entry.parentId) {
                 if (!sectionsByBlockId.has(entry.parentId)) {
                     sectionsByBlockId.set(entry.parentId, []);
                 }
                 sectionsByBlockId.get(entry.parentId)!.push(section);
             }
        } else {
            // It's a main block section (e.g. "3 Rounds")
            // Map its OWN id to itself, so children can find it if there are no sub-sections
            if (!sectionsByBlockId.has(section.id)) {
                sectionsByBlockId.set(section.id, []);
            }
            sectionsByBlockId.get(section.id)!.push(section);
        }
    };
    
    // We need to process chronologically
    allEntries.forEach(entry => {
      const isContainer = ['root', 'round', 'interval', 'warmup', 'cooldown', 'amrap', 'emom', 'tabata'].includes(entry.type.toLowerCase());
      
      if (isContainer || entry.type === 'start') {
        // This is a section header
        const section: LogSection = {
          id: entry.id,
          title: entry.label,
          startTime: entry.startTime,
          endTime: entry.endTime,
          entries: [], // Will hold children
          isActive: entry.status === 'active',
          type: entry.type
        };
        addSection(section);
      } else {
        // This is a leaf item
        // Find the best section for it
        let targetSection: LogSection | undefined;

        if (entry.parentId) {
            // Check if we have sections for this parent
            const candidates = sectionsByBlockId.get(entry.parentId);
            if (candidates && candidates.length > 0) {
                // Find the candidate that started most recently before this entry
                // (and ideally hasn't ended before this entry started, though that might be strict)
                
                // Sort candidates by start time (should be already sorted but let's be safe)
                // Actually they are pushed in order.
                
                // We want the last candidate where candidate.startTime <= entry.startTime
                for (let i = candidates.length - 1; i >= 0; i--) {
                    if (candidates[i].startTime <= entry.startTime + 100) { // +100ms tolerance
                        targetSection = candidates[i];
                        break;
                    }
                }
            }
        }
        
        // Fallback: Just look for any section with matching ID (if entry.parentId is null or not found)
        if (!targetSection) {
             if (resultSections.length > 0) {
                 targetSection = resultSections[resultSections.length - 1];
             } else {
                 // Create default
                 targetSection = {
                     id: 'default-root',
                     title: 'Workout',
                     startTime: entry.startTime,
                     entries: [],
                     isActive: true,
                     type: 'root'
                 };
                 addSection(targetSection);
             }
        }
        
        targetSection.entries.push(entry);
      }
    });
    
    return { sections: resultSections, activeLeafId };

  }, [runtime, workoutStartTime, updateVersion]);

  const { sections, activeLeafId } = useMemoResult;

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sections, autoScroll]);

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Top Fade Overlay */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />

      {mobile && (
        <div className="p-4 border-b border-border bg-muted/30 shrink-0 z-20 relative">
          <h3 className="text-sm font-semibold">Log</h3>
        </div>
      )}



      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 pt-2" ref={scrollRef}>
        {sections.length === 0 ? (
           <div className="p-4 text-sm text-muted-foreground italic mt-8">
             Waiting for workout to start...
             {activeBlock && (
               <div className="mt-4 border-t border-border pt-4">
                 <WorkoutContextPanel
                   block={activeBlock}
                   mode="run"
                   activeStatementIds={activeStatementIds}
                   className="shrink-0"
                 />
               </div>
             )}
           </div>
        ) : (
          <div className="space-y-6 mt-4">
            {sections.map(section => (
              <div key={section.id} className="relative">
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <span className="text-xs font-mono opacity-70">{formatTimestamp(section.startTime)}</span>
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs font-medium uppercase tracking-wider">{section.title}</span>
                </div>

                {/* Section Entries */}
                <div className="space-y-1 ml-4 border-l-2 border-border/50 pl-4 py-1">
                    {section.entries.map(entry => {
                        const isHighlighted = highlightedBlockKey === entry.id;
                        // Only the active leaf is "active" (highlighted with background)
                        const isActive = entry.id === activeLeafId;
                        // But we might want to show text color for all active items?
                        // Let's keep it simple: Highlight only the leaf.
                        // Parents will be text-muted-foreground unless they are the leaf.
                        
                        return (
                            <div 
                                key={entry.id}
                                className={cn(
                                    "flex items-center justify-between py-1 px-2 rounded text-sm transition-colors",
                                    isActive ? "bg-primary/5 text-foreground" : "text-muted-foreground",
                                    isHighlighted && "bg-primary/10 ring-1 ring-primary/20"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="font-mono text-xs opacity-50 w-[4.5rem] shrink-0">
                                        {formatTimestamp(entry.startTime)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <FragmentVisualizer fragments={entry.fragments} className="gap-1" compact />
                                    </div>
                                </div>
                                <div className="text-xs font-mono opacity-70 shrink-0 ml-2">
                                    {entry.endTime 
                                        ? formatDuration(entry.endTime - entry.startTime)
                                        : formatDuration(Date.now() - entry.startTime)
                                    }
                                </div>
                            </div>
                        );
                    })}
                    {section.entries.length === 0 && (
                        <div className="text-xs text-muted-foreground italic pl-2">
                            Starting...
                        </div>
                    )}
                </div>
              </div>
            ))}

            {/* Active Context at bottom */}
            {activeBlock && (
              <div className="mt-8 border-t border-border pt-4">
                 <WorkoutContextPanel
                   block={activeBlock}
                   mode="run"
                   activeStatementIds={activeStatementIds}
                   className="shrink-0"
                 />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
