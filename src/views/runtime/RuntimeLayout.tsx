import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bug, Play, Pause, Square, X, SkipForward } from 'lucide-react';
import { WodBlock } from '../../markdown-editor/types';
import { RuntimeStackPanel } from '../../runtime-test-bench/components/RuntimeStackPanel';
import { MemoryPanel } from '../../runtime-test-bench/components/MemoryPanel';
import { Segment } from '../../timeline/GitTreeSidebar';
import { useCommandPalette } from '../../components/command-palette/CommandContext';
import { TimelineView } from '../../timeline/TimelineView';
import { ExecutionLogPanel } from '../../components/workout/ExecutionLogPanel';
import { WorkoutContextPanel } from '../../components/workout/WorkoutContextPanel';

import { WodIndexPanel } from '../../components/layout/WodIndexPanel';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';

import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { WodScript } from '../../parser/WodScript';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { NextEvent } from '../../runtime/NextEvent';
import { RuntimeAdapter } from '../../runtime-test-bench/adapters/RuntimeAdapter';
import { MemoryTypeEnum } from '../../runtime/MemoryTypeEnum';
import { TimeSpan } from '../../runtime/behaviors/TimerBehavior';

// --- Mock Data Generation (Moved from TimelineView) ---
const generateSessionData = () => {
  const data: any[] = [];
  const segments: Segment[] = [];
  const totalDuration = 1200; // 20 min

  // Helper to add noise
  const noise = (amp: number) => (Math.random() - 0.5) * amp;

  // 1. Generate Raw Telemetry Stream
  for (let t = 0; t <= totalDuration; t++) {
    let targetPower = 100;
    
    if (t > 300 && t < 900) { // Main Set
      targetPower = 200;
      if ((t - 300) % 180 < 120) targetPower = 280; // Hard
      else targetPower = 120; // Easy
    } else if (t >= 900) {
      targetPower = 110;
    }

    const power = Math.max(0, targetPower + noise(20));
    const hrLag = (t > 0 ? data[t-1].hr : 60) * 0.95 + (60 + power * 0.5) * 0.05;
    const hr = hrLag + noise(2);
    const cadence = power > 150 ? 90 + noise(5) : 70 + noise(5);

    data.push({
      time: t,
      power: Math.round(power),
      hr: Math.round(hr),
      cadence: Math.round(cadence),
    });
  }

  // 2. Define Hierarchical Segments
  let segIdCounter = 0;
  const addSeg = (name: string, start: number, end: number, type: string, parentId: number | null = null, depth: number = 0) => {
    segIdCounter++;
    const segPoints = data.slice(start, end);
    const avgPwr = Math.round(segPoints.reduce((a,b) => a + b.power, 0) / segPoints.length);
    const avgHr = Math.round(segPoints.reduce((a,b) => a + b.hr, 0) / segPoints.length);
    
    const segment: Segment = {
      id: segIdCounter,
      name,
      type,
      startTime: start,
      endTime: end,
      duration: end - start,
      parentId,
      depth,
      avgPower: avgPwr || 0,
      avgHr: avgHr || 0,
      lane: depth // Map depth to visual lane 
    };
    segments.push(segment);
    return segment.id;
  };

  const rootId = addSeg("Full Session", 0, totalDuration, "root", null, 0);
  const wuId = addSeg("Warmup", 0, 300, "warmup", rootId, 1);
  addSeg("Spin Up", 200, 280, "ramp", wuId, 2); // Nested in warmup

  const mainId = addSeg("Main Set", 300, 900, "work", rootId, 1);
  for (let i = 0; i < 3; i++) {
    const start = 300 + (i * 180);
    addSeg(`Interval ${i+1}`, start, start + 120, "interval", mainId, 2);
    addSeg(`Recovery ${i+1}`, start + 120, start + 180, "rest", mainId, 2);
  }
  addSeg(`Interval 4`, 840, 900, "interval", mainId, 2);

  const cdId = addSeg("Cooldown", 900, totalDuration, "cooldown", rootId, 1);

  return { data, segments };
};

// Placeholder for Timer (reuse logic from WodWorkbench later or import)
const TimerDisplay = ({ elapsedMs, hasActiveBlock }: { elapsedMs: number, hasActiveBlock: boolean }) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (!hasActiveBlock) {
    return (
      <div className="text-8xl font-mono font-bold mb-12 tabular-nums tracking-wider text-muted-foreground/20 select-none">
        --:--:--
      </div>
    );
  }

  return (
    <div className="text-8xl font-mono font-bold mb-12 tabular-nums tracking-wider text-primary">
      {formatTime(elapsedMs)}
    </div>
  );
};

interface RuntimeLayoutProps {
  activeBlock: WodBlock | null;
  documentItems: DocumentItem[];
  onBlockClick: (item: DocumentItem) => void;
  onComplete: () => void;
  onBack: () => void;
  viewMode: 'run' | 'analyze';
  layoutMode?: 'split' | 'stacked';
}

export const RuntimeLayout: React.FC<RuntimeLayoutProps> = ({ 
  activeBlock, 
  documentItems,
  onBlockClick,
  onComplete, 
  onBack,
  viewMode,
  layoutMode = 'split'
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const [showLog, setShowLog] = useState(false); // For stacked mode
  
  // Analytics Data (Mock)
  const { data: analyticsData, segments: analyticsSegments } = React.useMemo(() => generateSessionData(), []);
  const [selectedAnalyticsIds, setSelectedAnalyticsIds] = useState(new Set([5, 7, 9, 11]));

  const handleSelectAnalyticsSegment = (id: number) => {
    const newSet = new Set(selectedAnalyticsIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAnalyticsIds(newSet);
  };
  
  // Runtime State
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const adapter = useRef(new RuntimeAdapter()).current;
  
  // Initialize Runtime when activeBlock changes
  useEffect(() => {
    if (activeBlock && activeBlock.statements) {
      // Create a new runtime instance
      const script = new WodScript(activeBlock.content, activeBlock.statements);
      const newRuntime = new ScriptRuntime(script, globalCompiler);
      
      // Initialize with root block
      // We need to cast statements to any because of type mismatch between ICodeStatement and CodeStatement
      // In a real app, we should unify these types
      const rootBlock = globalCompiler.compile(activeBlock.statements as any, newRuntime);
      
      if (rootBlock) {
          console.log('🚀 Initializing runtime with root block:', rootBlock.key.toString());
          newRuntime.stack.push(rootBlock);
          
          // Mount the block to register handlers and get initial actions
          const actions = rootBlock.mount(newRuntime);
          actions.forEach(action => action.do(newRuntime));
      } else {
          console.warn('⚠️ Failed to compile root block for runtime');
      }

      setRuntime(newRuntime);
    } else {
      setRuntime(null);
    }
  }, [activeBlock?.id, activeBlock?.content]);

  // Use execution hook
  const execution = useRuntimeExecution(runtime);
  
  // Create snapshot for UI rendering
  const snapshot = React.useMemo(() => {
    if (!runtime) return null;
    return adapter.createSnapshot(runtime);
  }, [runtime, execution.stepCount]);

  // Command Palette
  const { setIsOpen: _setIsOpen, setSearch: _setSearch } = useCommandPalette();

  // Runtime Simulation State (Legacy/Visuals)
  const [runtimeSegments, setRuntimeSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to generate stable ID from string
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Real Runtime Data Integration
  useEffect(() => {
    if (!runtime) return;

    // 1. Get Completed Segments from Execution Log
    const historySegments: Segment[] = runtime.executionLog.map(record => ({
        id: hashCode(record.blockId),
        name: record.label,
        type: record.type.toLowerCase(),
        startTime: Math.floor(record.startTime / 1000),
        endTime: Math.floor((record.endTime ?? Date.now()) / 1000),
        duration: ((record.endTime ?? Date.now()) - record.startTime) / 1000,
        parentId: record.parentId ? hashCode(record.parentId) : null,
        depth: 0, // Will be calculated later if needed, or handled by GitTreeSidebar
        avgPower: 0,
        avgHr: 0,
        lane: 0
    }));

    // 2. Get Active Segments from Stack
    const activeSegments: Segment[] = runtime.stack.blocks.map(block => {
        let startTime = Date.now();
        let duration = 0;
        
        // Check for start time in memory (allocated by HistoryBehavior)
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
                duration = (Date.now() - startTime) / 1000;
            }
        } else {
            // Fallback: Check for timer memory (legacy support)
            const timeSpansRef = runtime.memory.search({ 
                type: MemoryTypeEnum.TIMER_TIME_SPANS, 
                ownerId: block.key.toString(),
                id: null,
                visibility: null
            })[0];
            
            if (timeSpansRef) {
                const timeSpans = runtime.memory.get(timeSpansRef as any) as TimeSpan[];
                if (timeSpans && timeSpans.length > 0 && timeSpans[0].start) {
                    startTime = timeSpans[0].start.getTime();
                    duration = (Date.now() - startTime) / 1000;
                }
            }
        }

        // Determine parent
        const stackIndex = runtime.stack.blocks.indexOf(block);
        const parentId = stackIndex > 0 ? runtime.stack.blocks[stackIndex - 1].key.toString() : null;

        return {
            id: hashCode(block.key.toString()),
            name: block.blockType || block.key.toString(),
            type: (block.blockType || 'unknown').toLowerCase(),
            startTime: Math.floor(startTime / 1000),
            endTime: Math.floor(Date.now() / 1000), // Currently running
            duration: duration,
            parentId: parentId ? hashCode(parentId) : null,
            depth: stackIndex,
            avgPower: 0,
            avgHr: 0,
            lane: 0
        };
    });

    // Combine and Sort
    const allSegments = [...historySegments, ...activeSegments].sort((a, b) => a.startTime - b.startTime);
    
    // Normalize Start Times (relative to first segment)
    if (allSegments.length > 0) {
        const minStartTime = allSegments[0].startTime;
        allSegments.forEach(s => {
            s.startTime -= minStartTime;
            s.endTime -= minStartTime;
        });
    }

    setRuntimeSegments(allSegments);

    // 3. Determine Active Segment from Stack
    if (snapshot && snapshot.stack.blocks.length > 0) {
        const topBlock = snapshot.stack.blocks[snapshot.stack.blocks.length - 1];
        setActiveSegmentId(hashCode(topBlock.key));
    } else {
        setActiveSegmentId(null);
    }
    
    // Auto-scroll to bottom if running
    if (execution.status === 'running' && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

  }, [runtime, execution.stepCount, execution.elapsedTime, snapshot, execution.status]);

  const handleStart = () => {
    execution.start();
    // Add initial root segment if empty
    if (runtimeSegments.length === 0) {
      setRuntimeSegments([{
        id: 1,
        name: "Workout Session",
        type: "root",
        startTime: 0,
        endTime: 0,
        duration: 0,
        parentId: null,
        depth: 0,
        avgPower: 0,
        avgHr: 0,
        lane: 0
      }]);
    }
  };

  const handlePause = () => {
    execution.pause();
  };

  const handleStop = () => {
    execution.stop();
    onComplete();
  };

  const handleNext = () => {
    if (runtime) {
      runtime.handle(new NextEvent());
      // Force a step to update UI immediately
      execution.step();
    }
  };

  // Determine panel widths based on layout mode
  const leftPanelClass = layoutMode === 'stacked' 
    ? `absolute inset-0 z-20 bg-background transition-transform duration-300 ${showLog ? 'translate-x-0' : '-translate-x-full'}`
    : 'w-1/3 border-r border-border relative';
    
  const rightPanelClass = layoutMode === 'stacked'
    ? 'w-full relative'
    : 'w-2/3 relative';

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Left Panel: Execution Log */}
      <div className={`${leftPanelClass} flex flex-col overflow-y-auto custom-scrollbar`} ref={scrollRef}>
        
        {activeBlock ? (
          <>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 border-b border-border flex items-center justify-between">
               <Button variant="ghost" size="sm" onClick={layoutMode === 'stacked' ? () => setShowLog(false) : onBack} className="gap-2">
                 <ChevronLeft className="h-4 w-4" />
                 {layoutMode === 'stacked' ? 'Back to Timer' : 'Back to Index'}
               </Button>
               {viewMode === 'run' && (
               <Button variant="ghost" size="icon" onClick={() => setShowDebug(true)}>
                 <Bug className="h-4 w-4" />
               </Button>
               )}
            </div>

            {/* Execution Log (Growing as workout progresses) */}
            <ExecutionLogPanel
              runtime={viewMode === 'run' ? runtime : null}
              historicalSegments={viewMode === 'analyze' ? runtimeSegments : undefined}
              activeSegmentId={activeSegmentId}
              disableScroll={true}
            >
              {/* "Feeding" Connector Visual */}
              <div className="h-8 w-px bg-border mx-auto my-2 border-l-2 border-dashed border-muted-foreground/30"></div>
            </ExecutionLogPanel>

            {/* Workout Context Panel */}
            <WorkoutContextPanel
              block={activeBlock}
              mode={viewMode === 'analyze' ? 'analyze' : 'run'}
            />

            {/* Debug Overlay */}
            {showDebug && (
              <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
                <div className="p-2 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-semibold ml-2">Runtime Debugger</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowDebug(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <RuntimeStackPanel 
                    blocks={snapshot?.stack.blocks || []} 
                    activeBlockIndex={snapshot?.stack.activeIndex}
                    highlightedBlockKey={undefined}
                    className="border-b border-border"
                  />
                  <MemoryPanel 
                    entries={snapshot?.memory.entries || []}
                    groupBy="owner"
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <WodIndexPanel 
            items={documentItems}
            activeBlockId={undefined}
            onBlockClick={onBlockClick}
            onBlockHover={() => {}}
          />
        )}
      </div>

      {/* Right Panel: Timer or Analytics */}
      <div className={`${rightPanelClass} bg-background relative overflow-hidden`}>
        {/* Timer Panel */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-transform duration-500 ease-in-out ${viewMode === 'analyze' ? '-translate-x-full' : 'translate-x-0'}`}>
            <h2 className="text-2xl font-bold mb-8 text-muted-foreground">Workout Timer</h2>
            <TimerDisplay elapsedMs={execution.elapsedTime} hasActiveBlock={!!activeBlock} />
            
            {activeBlock ? (
              <div className="flex gap-6 mt-12">
                 {execution.status !== 'running' ? (
                   <Button onClick={handleStart} size="lg" className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 p-0">
                     <Play className="h-8 w-8 fill-current" />
                   </Button>
                 ) : (
                   <Button onClick={handlePause} size="lg" className="h-16 w-16 rounded-full bg-yellow-600 hover:bg-yellow-700 p-0">
                     <Pause className="h-8 w-8 fill-current" />
                   </Button>
                 )}
                 
                 <Button onClick={handleNext} size="lg" className="h-16 w-16 rounded-full bg-blue-600 hover:bg-blue-700 p-0">
                   <SkipForward className="h-8 w-8 fill-current" />
                 </Button>

                 <Button onClick={handleStop} size="lg" variant="destructive" className="h-16 w-16 rounded-full p-0">
                   <Square className="h-6 w-6 fill-current" />
                 </Button>
              </div>
            ) : (
              <div className="mt-12 p-6 rounded-lg border border-border bg-card text-card-foreground shadow-sm max-w-md text-center">
                 <h3 className="font-semibold mb-2">No Workout Selected</h3>
                 <p className="text-sm text-muted-foreground">Select a WOD block from the index to begin tracking.</p>
              </div>
            )}
            
            {/* Toggle Log Button (Stacked Mode) */}
            {layoutMode === 'stacked' && activeBlock && (
               <Button variant="outline" size="sm" className="mt-12 gap-2" onClick={() => setShowLog(true)}>
                 <ChevronLeft className="h-4 w-4" /> View Log
               </Button>
            )}
        </div>

        {/* Analytics Panel */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-500 ease-in-out ${viewMode === 'analyze' ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="flex-1 overflow-hidden">
             <TimelineView 
               rawData={analyticsData}
               segments={analyticsSegments}
               selectedSegmentIds={selectedAnalyticsIds}
               onSelectSegment={handleSelectAnalyticsSegment}
             />
           </div>
        </div>
      </div>
    </div>
  );
};
