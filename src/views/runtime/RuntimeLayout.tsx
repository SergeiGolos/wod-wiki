import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, Pause, Square, SkipForward } from 'lucide-react';
import { WodBlock } from '../../markdown-editor/types';
import { Segment } from '../../timeline/GitTreeSidebar';
import { useCommandPalette } from '../../components/command-palette/CommandContext';
import { TimelineView } from '../../timeline/TimelineView';
import { RuntimeHistoryPanel } from '../../components/workout/RuntimeHistoryPanel';
import { AnalyticsHistoryPanel } from '../../components/workout/AnalyticsHistoryPanel';
import { WorkoutContextPanel } from '../../components/workout/WorkoutContextPanel';
import { RuntimeDebugPanel, DebugButton } from '../../components/workout/RuntimeDebugPanel';

import { WodIndexPanel } from '../../components/layout/WodIndexPanel';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';

import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { WodScript } from '../../parser/WodScript';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { NextEvent } from '../../runtime/NextEvent';

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
  isDebugMode?: boolean;
  onDebugModeChange?: (isDebug: boolean) => void;
}

export const RuntimeLayout: React.FC<RuntimeLayoutProps> = ({ 
  activeBlock, 
  documentItems,
  onBlockClick,
  onComplete, 
  onBack,
  viewMode,
  layoutMode = 'split',
  isDebugMode = false,
  onDebugModeChange
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
  
  // Initialize Runtime when activeBlock changes
  useEffect(() => {
    if (activeBlock && activeBlock.statements) {
      // Create a new runtime instance
      const script = new WodScript(activeBlock.content, activeBlock.statements);
      const newRuntime = new ScriptRuntime(script, globalCompiler);
      
      // Initialize with root block
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

  // Command Palette
  const { setIsOpen: _setIsOpen, setSearch: _setSearch } = useCommandPalette();

  // Active segments for runtime tracking
  const activeSegmentIds = React.useMemo(() => {
    if (!runtime || viewMode !== 'run') return new Set<number>();
    
    const hashCode = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    return new Set(runtime.stack.blocks.map(block => hashCode(block.key.toString())));
  }, [runtime, execution.stepCount, viewMode]);

  // Active statement IDs (blocks currently on the stack)
  const activeStatementIds = React.useMemo(() => {
    if (!runtime || viewMode !== 'run') return new Set<number>();
    
    // Collect all source IDs from blocks on the stack
    const ids = new Set<number>();
    runtime.stack.blocks.forEach(block => {
      if (block.sourceIds) {
        block.sourceIds.forEach(id => ids.add(id));
      }
    });
    
    return ids;
  }, [runtime, execution.stepCount, viewMode]);

  const handleStart = () => {
    execution.start();
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
      {/* Left Panel: Execution History */}
      <div className={`${leftPanelClass} flex flex-col`}>
        
        {activeBlock ? (
          <>
            {/* Header with Back button */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 border-b border-border flex items-center shrink-0">
               <Button variant="ghost" size="sm" onClick={layoutMode === 'stacked' ? () => setShowLog(false) : onBack} className="gap-2">
                 <ChevronLeft className="h-4 w-4" />
                 {layoutMode === 'stacked' ? 'Back to Timer' : 'Back to Index'}
               </Button>
            </div>

            {/* Active Context + Execution History - Different components for Run vs Analyze */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {viewMode === 'run' ? (
                <>
                  {/* Active Context Panel - At Top */}
                  <WorkoutContextPanel
                    block={activeBlock}
                    mode="run"
                    activeStatementIds={activeStatementIds}
                    className="shrink-0 border-b border-border"
                  />

                  {/* Execution History Panel - Below Context */}
                  <RuntimeHistoryPanel
                    runtime={runtime}
                    activeSegmentIds={activeSegmentIds}
                    autoScroll={execution.status === 'running'}
                    className="flex-1"
                  />
                </>
              ) : (
                <>
                  <AnalyticsHistoryPanel
                    segments={analyticsSegments}
                    selectedSegmentIds={selectedAnalyticsIds}
                    onSelectSegment={handleSelectAnalyticsSegment}
                    className="flex-1"
                  />

                  {/* Workout Context Panel */}
                  <WorkoutContextPanel
                    block={activeBlock}
                    mode="analyze"
                    className="shrink-0"
                  />
                </>
              )}
            </div>
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

      {/* Debug Panel - Slide-out from right */}
      <RuntimeDebugPanel
        runtime={runtime}
        isOpen={isDebugMode && viewMode === 'run'}
        onClose={() => onDebugModeChange?.(false)}
      />

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
