import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bug, Play, Pause, Square, X, SkipForward } from 'lucide-react';
import { WodBlock } from '../../markdown-editor/types';
import { RuntimeStackPanel } from '../../runtime-test-bench/components/RuntimeStackPanel';
import { MemoryPanel } from '../../runtime-test-bench/components/MemoryPanel';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { useCommandPalette } from '../../components/command-palette/CommandContext';
import { EditableStatementList } from '../../markdown-editor/components/EditableStatementList';

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
}

export const RuntimeLayout: React.FC<RuntimeLayoutProps> = ({ 
  activeBlock, 
  documentItems,
  onBlockClick,
  onComplete, 
  onBack 
}) => {
  const [showDebug, setShowDebug] = useState(false);
  
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
  }, [activeBlock]);

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

    // 1. Get TimeSpans from memory
    const timeSpanRefs = runtime.memory.search({ 
      type: MemoryTypeEnum.TIMER_TIME_SPANS,
      id: null,
      ownerId: null,
      visibility: null
    });
    
    let minStartTime = Infinity;

    const rawSegments = timeSpanRefs.map(ref => {
      const timeSpans = runtime.memory.get(ref as any) as TimeSpan[];
      if (!timeSpans || timeSpans.length === 0) return null;

      const firstStart = timeSpans[0].start?.getTime() || Date.now();
      if (firstStart < minStartTime) minStartTime = firstStart;
      
      const lastStop = timeSpans[timeSpans.length - 1].stop?.getTime() || Date.now();
      
      // Calculate actual active duration (sum of spans)
      const durationSeconds = timeSpans.reduce((acc, span) => {
        const start = span.start?.getTime() || 0;
        const stop = span.stop?.getTime() || Date.now();
        return acc + (stop - start);
      }, 0) / 1000;

      return {
        ref,
        firstStart,
        lastStop,
        durationSeconds
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    if (rawSegments.length === 0) {
        setRuntimeSegments([]);
        setActiveSegmentId(null);
        return;
    }

    const newSegments: Segment[] = rawSegments.map(item => {
        return {
            id: hashCode(item.ref.ownerId),
            name: item.ref.ownerId, // TODO: Improve naming based on block type/content
            type: 'work',
            startTime: Math.floor((item.firstStart - minStartTime) / 1000),
            endTime: Math.floor((item.lastStop - minStartTime) / 1000),
            duration: item.durationSeconds,
            parentId: null,
            depth: 0,
            avgPower: 0,
            avgHr: 0,
            lane: 0
        };
    }).sort((a, b) => a.startTime - b.startTime);

    setRuntimeSegments(newSegments);

    // 2. Determine Active Segment from Stack
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

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Left Panel: Execution Log (1/3) */}
      <div className="w-1/3 border-r border-border flex flex-col bg-background relative overflow-y-auto custom-scrollbar" ref={scrollRef}>
        
        {activeBlock ? (
          <>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 border-b border-border flex items-center justify-between">
               <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
                 <ChevronLeft className="h-4 w-4" />
                 Back to Index
               </Button>
               <Button variant="ghost" size="icon" onClick={() => setShowDebug(true)}>
                 <Bug className="h-4 w-4" />
               </Button>
            </div>

            {/* Segment Topology (Growing Log) */}
            <GitTreeSidebar 
              segments={runtimeSegments}
              selectedIds={new Set(activeSegmentId ? [activeSegmentId] : [])}
              onSelect={() => {}}
              disableScroll={true}
              hideHeader={true}
            >
               {/* "Feeding" Connector Visual */}
               <div className="h-8 w-px bg-border mx-auto my-2 border-l-2 border-dashed border-muted-foreground/30"></div>
            </GitTreeSidebar>

            {/* Active Block Context (Source) */}
            <div className="border-t border-border bg-muted/10 flex flex-col min-h-[200px]">
              <div className="p-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center bg-muted/20">
                <span>Active Context</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">READ ONLY</span>
              </div>
              <div className="p-4 font-mono text-sm relative">
                 {/* Visual indicator connecting to top */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-background border border-border rotate-45 z-10"></div>
                 
                 <EditableStatementList 
                    statements={activeBlock.statements || []} 
                    readonly={true} 
                 />
                 
                 {(!activeBlock.statements || activeBlock.statements.length === 0) && (
                    <div className="text-muted-foreground italic">// No parsed statements available</div>
                 )}
              </div>
            </div>

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

      {/* Right Panel: Timer (2/3) */}
      <div className="w-2/3 flex flex-col items-center justify-center bg-background relative">
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
      </div>
    </div>
  );
};
