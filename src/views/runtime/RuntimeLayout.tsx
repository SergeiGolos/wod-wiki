import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bug, Play, Pause, Square, Edit2, Trash2 } from 'lucide-react';
import { WodBlock } from '../../markdown-editor/types';
import { RuntimeStackPanel } from '../../runtime-test-bench/components/RuntimeStackPanel';
import { MemoryPanel } from '../../runtime-test-bench/components/MemoryPanel';
import { GitTreeSidebar, Segment } from '../../timeline/GitTreeSidebar';
import { useCommandPalette } from '../../components/command-palette/CommandContext';

// Placeholder for Timer (reuse logic from WodWorkbench later or import)
const TimerDisplay = ({ isRunning, elapsedMs }: { isRunning: boolean, elapsedMs: number }) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-8xl font-mono font-bold mb-12 tabular-nums tracking-wider text-primary">
      {formatTime(elapsedMs)}
    </div>
  );
};

interface RuntimeLayoutProps {
  activeBlock: WodBlock | null;
  onComplete: () => void;
}

export const RuntimeLayout: React.FC<RuntimeLayoutProps> = ({ activeBlock, onComplete }) => {
  const [showDebug, setShowDebug] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);
  
  // Command Palette
  const { setIsOpen, setSearch } = useCommandPalette();

  // Runtime Simulation State
  const [runtimeSegments, setRuntimeSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Timer Logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isRunning && startTime !== null) {
      intervalId = setInterval(() => {
        const now = Date.now();
        setElapsedMs(now - startTime + pausedTime);
      }, 10);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isRunning, startTime, pausedTime]);

  // Simulate Segment Generation
  useEffect(() => {
    if (!isRunning) return;

    // Add a new segment every 5 seconds for demo purposes
    const interval = setInterval(() => {
      const id = Date.now();
      const newSegment: Segment = {
        id,
        name: `Interval ${runtimeSegments.length + 1}`,
        type: runtimeSegments.length % 2 === 0 ? 'work' : 'rest',
        startTime: Math.floor(elapsedMs / 1000),
        endTime: Math.floor(elapsedMs / 1000) + 30,
        duration: 30,
        parentId: runtimeSegments.length > 0 ? runtimeSegments[0].id : null, // Link to first for demo
        depth: 1,
        avgPower: 200 + Math.random() * 50,
        avgHr: 140 + Math.random() * 20,
        lane: 1
      };
      
      setRuntimeSegments(prev => [...prev, newSegment]);
      setActiveSegmentId(id);
      
      // Auto-scroll to bottom
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, runtimeSegments, elapsedMs]);

  const handleStart = () => {
    setStartTime(Date.now());
    setIsRunning(true);
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
    if (startTime !== null) setPausedTime(Date.now() - startTime + pausedTime);
    setIsRunning(false);
    setStartTime(null);
  };

  const handleStop = () => {
    setIsRunning(false);
    onComplete();
  };

  // Mock data for Debug View
  const mockBlocks = [
    { key: '1', label: 'Timer 10:00', status: 'active', depth: 0, children: ['2', '3'], blockType: 'Timer' },
    { key: '2', label: '10 Pushups', status: 'pending', depth: 1, children: [], blockType: 'Exercise' },
    { key: '3', label: '10 Situps', status: 'pending', depth: 1, children: [], blockType: 'Exercise' },
  ];

  const mockMemory = [
    { id: '1', address: '0x001', valueFormatted: '10:00', label: 'Timer Duration', type: 'Time', isValid: true, ownerId: '1' },
    { id: '2', address: '0x002', valueFormatted: '0', label: 'Rounds Completed', type: 'Counter', isValid: true, ownerId: '1' },
  ];

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Left Panel: Execution Log (1/3) */}
      <div className="w-1/3 border-r border-border flex flex-col bg-background">
        
        {/* Top: Segment Topology (Growing Log) */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
           <GitTreeSidebar 
             segments={runtimeSegments}
             selectedIds={new Set(activeSegmentId ? [activeSegmentId] : [])}
             onSelect={() => {}}
             scrollContainerRef={scrollRef}
           >
              {/* "Feeding" Connector Visual */}
              <div className="h-8 w-px bg-border mx-auto my-2 border-l-2 border-dashed border-muted-foreground/30"></div>
           </GitTreeSidebar>
        </div>

        {/* Bottom: Active Block Context (Source) */}
        <div className="h-1/3 border-t border-border bg-muted/10 flex flex-col">
          <div className="p-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
            <span>Active Context</span>
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">READ ONLY</span>
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-sm relative">
             {/* Visual indicator connecting to top */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-background border border-border rotate-45 z-10"></div>
             
             <div className="space-y-1">
               {(activeBlock?.content || '').split('\n').map((line, i) => (
                 <div key={i} className="group flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors">
                   <span className="text-muted-foreground w-6 text-right select-none text-xs">{i + 1}</span>
                   <span className="flex-1 text-foreground/80 whitespace-pre-wrap">{line}</span>
                   
                   {/* Line Actions */}
                   <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-6 w-6"
                       onClick={() => {
                         setSearch(line.trim());
                         setIsOpen(true);
                       }}
                     >
                       <Edit2 className="h-3 w-3" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                       <Trash2 className="h-3 w-3" />
                     </Button>
                   </div>
                 </div>
               ))}
               {!activeBlock?.content && (
                 <div className="text-muted-foreground italic">// No active block content</div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Timer (2/3) */}
      <div className="w-2/3 flex flex-col items-center justify-center bg-background relative">
        {/* Debug Toggle Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className={showDebug ? "bg-muted" : ""}
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
        </div>

        <h2 className="text-2xl font-bold mb-8 text-muted-foreground">Workout Timer</h2>
        <TimerDisplay isRunning={isRunning} elapsedMs={elapsedMs} />
        
        <div className="flex gap-6 mt-12">
           {!isRunning ? (
             <Button onClick={handleStart} size="lg" className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 p-0">
               <Play className="h-8 w-8 fill-current" />
             </Button>
           ) : (
             <Button onClick={handlePause} size="lg" className="h-16 w-16 rounded-full bg-yellow-600 hover:bg-yellow-700 p-0">
               <Pause className="h-8 w-8 fill-current" />
             </Button>
           )}
           
           <Button onClick={handleStop} size="lg" variant="destructive" className="h-16 w-16 rounded-full p-0">
             <Square className="h-6 w-6 fill-current" />
           </Button>
        </div>
      </div>

      {/* Debug Drawer (Slide out) */}
      <div 
        className={`absolute top-0 right-0 h-full w-80 bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${
          showDebug ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
            <h3 className="font-semibold">Runtime Debugger</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowDebug(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <RuntimeStackPanel 
              blocks={mockBlocks as any} // Cast for now as types might mismatch slightly
              activeBlockIndex={0}
              highlightedBlockKey={undefined}
            />
            <MemoryPanel 
              entries={mockMemory as any}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
