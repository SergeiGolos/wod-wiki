import React, { useMemo, useEffect, useRef } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { cn } from '../../lib/utils';
import { FragmentVisualizer } from '../../views/runtime/FragmentVisualizer';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { 
  spanMetricsToFragments
} from '../../runtime/utils/metricsToFragments';
import { SpanMetrics, createEmptyMetrics } from '../../runtime/models/ExecutionSpan';

export interface RuntimeEventLogProps {
  runtime: ScriptRuntime | null;
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
  metrics: SpanMetrics; // Keep raw metrics for inheritance
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

export const RuntimeEventLog: React.FC<RuntimeEventLogProps> = ({
  runtime,

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
    
    // 1. Start Entry - only add if there's actual workout content
    // We now INCLUDE idle blocks, so "Workout Started" might be redundant if we have "Ready"
    // But let's keep it if there are non-idle blocks to signify the "real" work starting.
    // Or we can just rely on the log.
    // Let's keep the logic but remove the filter, so "Workout Started" appears at the very beginning.
    // Actually, if we show "Ready", we might not want "Workout Started" to appear *before* Ready.
    // "Ready" IS the start of the runtime.
    // Let's remove the synthetic "Workout Started" entry and rely on the actual blocks (Root/Idle).
    // If the user wants a "Workout Started" banner, it should probably be the Root block.

    // 2. Completed Entries (INCLUDE idle blocks now)
    runtime.executionLog
      .forEach(record => {
      // We'll process metrics later to handle inheritance
      allEntries.push({
        id: record.id,
        label: record.label,
        type: record.type,
        status: record.status === 'failed' ? 'failed' : 'completed',
        startTime: record.startTime,
        endTime: record.endTime,
        fragments: [], // Will populate
        parentId: record.parentSpanId,
        depth: 0,
        metrics: record.metrics || createEmptyMetrics()
      });
    });

    // 3. Active Entries (from activeSpans)
    const activeSpans = runtime.activeSpans; // Map<string, ExecutionSpan>
    
    activeSpans.forEach(record => {
       allEntries.push({
        id: record.id,
        label: record.label,
        type: record.type,
        status: 'active',
        startTime: record.startTime,
        endTime: undefined,
        fragments: [], // Will populate
        parentId: record.parentSpanId,
        depth: 0,
        metrics: record.metrics || createEmptyMetrics()
      });
    });

    allEntries.sort((a, b) => a.startTime - b.startTime);

    // --- Post-process for Inherited Metrics ---
    // Create a map for quick lookup
    const entryMap = new Map<string, LogEntry>();
    allEntries.forEach(e => entryMap.set(e.id, e));

    allEntries.forEach(entry => {
        // Collect inheritable metrics from ancestors
        // We merge metrics from parent into a combined SpanMetrics object
        // Only inheriting non-timer metrics (reps, weight, rounds, etc.)
        const combinedMetrics: SpanMetrics = { ...entry.metrics };
        
        // Walk up the chain
        let currentParentId = entry.parentId;
        const visited = new Set<string>();
        visited.add(entry.id);

        while (currentParentId) {
            if (visited.has(currentParentId)) {
                console.warn(`Circular dependency detected in log entry parents for entry ${entry.id}`);
                break;
            }
            visited.add(currentParentId);

            const parent = entryMap.get(currentParentId);
            if (parent && parent.metrics) {
                const pm = parent.metrics;
                
                // Inherit reps if child doesn't have them
                if (pm.reps && !combinedMetrics.reps) {
                    combinedMetrics.reps = pm.reps;
                }
                // Inherit targetReps if child doesn't have it
                if (pm.targetReps !== undefined && combinedMetrics.targetReps === undefined) {
                    combinedMetrics.targetReps = pm.targetReps;
                }
                // Inherit weight if child doesn't have it
                if (pm.weight && !combinedMetrics.weight) {
                    combinedMetrics.weight = pm.weight;
                }
                // Inherit round info
                if (pm.currentRound !== undefined && combinedMetrics.currentRound === undefined) {
                    combinedMetrics.currentRound = pm.currentRound;
                }
                if (pm.totalRounds !== undefined && combinedMetrics.totalRounds === undefined) {
                    combinedMetrics.totalRounds = pm.totalRounds;
                }
                // Inherit rep scheme
                if (pm.repScheme && !combinedMetrics.repScheme) {
                    combinedMetrics.repScheme = pm.repScheme;
                }
                // Inherit distance if child doesn't have it
                if (pm.distance && !combinedMetrics.distance) {
                    combinedMetrics.distance = pm.distance;
                }
                // Inherit legacy metrics if needed
                if (pm.legacyMetrics && pm.legacyMetrics.length > 0 && 
                    (!combinedMetrics.legacyMetrics || combinedMetrics.legacyMetrics.length === 0)) {
                    // Only inherit non-timer legacy metrics
                    const inheritableMetrics = pm.legacyMetrics.filter(
                        m => !m.values.some(v => v.type === 'time' || v.type === 'timestamp')
                    );
                    if (inheritableMetrics.length > 0) {
                        combinedMetrics.legacyMetrics = [
                            ...(combinedMetrics.legacyMetrics || []),
                            ...inheritableMetrics
                        ];
                    }
                }
                
                currentParentId = parent.parentId;
            } else {
                break;
            }
        }

        // Generate fragments using spanMetricsToFragments
        entry.fragments = spanMetricsToFragments(combinedMetrics, entry.label, entry.type);
    });


    // Identify the "Active Leaf"
    let activeLeafId: string | null = null;
    const activeEntries = allEntries.filter(e => e.status === 'active');
    if (activeEntries.length > 0) {
        activeLeafId = activeEntries[activeEntries.length - 1].id;
    }

    // Group into sections
    const resultSections: LogSection[] = [];
    const sectionsByBlockId = new Map<string, LogSection[]>();
    // New map to find sibling sections (e.g. Round 1, Round 2) that share the same parent (EMOM)
    const sectionsByParentId = new Map<string, LogSection[]>();

    const addSection = (section: LogSection) => {
        // Check if the last section has the same title and type
        // If so, merge them to avoid duplicate headers (e.g. "Round 1" -> "Round 1")
        const lastSection = resultSections.length > 0 ? resultSections[resultSections.length - 1] : null;
        
        if (lastSection && lastSection.title === section.title && lastSection.type === section.type) {
             // Merge logic: just update the end time and keep the ID of the first one?
             // Or maybe we should treat them as one continuous section.
             // We won't push the new section, but we need to map the NEW section ID to the OLD section
             // so that children of the new block find the old section.
             if (section.endTime && (!lastSection.endTime || section.endTime > lastSection.endTime)) {
                 lastSection.endTime = section.endTime;
             }
             
             // Map the NEW block ID to the EXISTING section
             if (!sectionsByBlockId.has(section.id)) {
                sectionsByBlockId.set(section.id, []);
             }
             sectionsByBlockId.get(section.id)!.push(lastSection);
             return;
        }

        resultSections.push(section);
        
        // Map section ID (its own ID)
        if (!sectionsByBlockId.has(section.id)) {
            sectionsByBlockId.set(section.id, []);
        }
        sectionsByBlockId.get(section.id)!.push(section);

        // Map parent ID (to find siblings)
        // We need to look up the entry that created this section to get its parentId
        const entry = allEntries.find(e => e.id === section.id);
        if (entry && entry.parentId) {
            if (!sectionsByParentId.has(entry.parentId)) {
                sectionsByParentId.set(entry.parentId, []);
            }
            sectionsByParentId.get(entry.parentId)!.push(section);
        }
    };
    
    allEntries.forEach(entry => {
      // Skip the active leaf - it should appear in the "Next" area, not in history
      // Only show completed entries and active CONTAINER entries (like active rounds)
      if (entry.id === activeLeafId && entry.status === 'active') {
        // Don't add active leaf to history - it's shown in the Next button area
        return;
      }
      
      // Treat Idle as a container/section so it shows up distinct
      const isContainer = ['root', 'round', 'interval', 'warmup', 'cooldown', 'amrap', 'emom', 'tabata', 'idle'].includes(entry.type.toLowerCase());
      
      if (isContainer || entry.type === 'start') {
        const section: LogSection = {
          id: entry.id,
          title: entry.type.toLowerCase() === 'idle' ? 'Ready' : entry.label, // Rename Idle to Ready for display
          startTime: entry.startTime,
          endTime: entry.endTime,
          entries: [],
          isActive: entry.status === 'active',
          type: entry.type
        };
        addSection(section);
      } else {
        // Leaf item
        let targetSection: LogSection | undefined;

        // 1. Try to find a direct parent section (e.g. if this is a child of a Round block)
        if (entry.parentId) {
            const candidates = sectionsByBlockId.get(entry.parentId);
            if (candidates && candidates.length > 0) {
                // Find best candidate
                for (let i = candidates.length - 1; i >= 0; i--) {
                    if (candidates[i].startTime <= entry.startTime + 100) {
                        targetSection = candidates[i];
                        break;
                    }
                }
            }
        }

        // 2. If no direct parent section found, check for SIBLING sections (e.g. Round 1, Round 2)
        // This happens when the exercise is a direct child of the Loop (EMOM), but we want it grouped under the current Round.
        if (!targetSection && entry.parentId) {
            const siblingSections = sectionsByParentId.get(entry.parentId);
            if (siblingSections) {
                // Filter for container types that act as groups (rounds, intervals)
                const candidates = siblingSections.filter(s => 
                    ['round', 'interval', 'warmup', 'cooldown'].includes(s.type.toLowerCase())
                );
                
                // Find the one that covers this entry's time
                // We want the LATEST one that started BEFORE this entry
                for (let i = candidates.length - 1; i >= 0; i--) {
                    const s = candidates[i];
                    // Entry must start after section start (with small buffer)
                    if (s.startTime <= entry.startTime + 100) {
                        // And if section has ended, entry must be within it (or close to end)
                        // But usually rounds are sequential.
                        // If we have "Round 1" (active) and "Round 2" (not started), we pick Round 1.
                        targetSection = s;
                        break;
                    }
                }
            }
        }
        
        if (!targetSection) {
             if (resultSections.length > 0) {
                 targetSection = resultSections[resultSections.length - 1];
             } else {
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
    
    // Add "Workout Completed" section if:
    // 1. There are entries (workout was started)
    // 2. No active entries (everything is completed)
    // 3. Runtime stack is empty or has only idle block
    const hasEntries = allEntries.length > 0;
    const hasNoActiveEntries = activeEntries.length === 0;
    const isWorkoutComplete = hasEntries && hasNoActiveEntries && runtime.stack.depth <= 1;
    
    if (isWorkoutComplete && resultSections.length > 0) {
        // Find the last completion timestamp
        const lastCompletedEntry = allEntries
            .filter(e => e.endTime)
            .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];
        
        if (lastCompletedEntry) {
            const completedSection: LogSection = {
                id: 'workout-completed',
                title: 'Workout Completed',
                startTime: lastCompletedEntry.endTime!,
                endTime: lastCompletedEntry.endTime,
                entries: [],
                isActive: false,
                type: 'completed'
            };
            resultSections.push(completedSection);
        }
    }
    
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
             Initializing...
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
                        const isActive = entry.id === activeLeafId;
                        
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
                    {section.entries.length === 0 && section.type.toLowerCase() !== 'idle' && (
                        <div className="text-xs text-muted-foreground italic pl-2">
                            ...
                        </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
