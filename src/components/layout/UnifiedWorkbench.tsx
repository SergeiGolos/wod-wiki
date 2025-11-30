/**
 * UnifiedWorkbench - Responsive workbench combining desktop and mobile views
 * 
 * This component implements the "sliding viewport" model where the app is a
 * viewport sliding across a horizontal strip of panels:
 * 
 * PLAN:    [Editor 2/3][EditorIndex 1/3]
 * TRACK:   [TimerIndex 1/3][Timer 2/3]
 * ANALYZE: [AnalyticsIndex 1/3][Timeline 2/3]
 * 
 * Responsive behavior:
 * - Desktop (≥1024px): Full sliding strip with side-by-side panels
 * - Tablet (768-1024px): Stacked with bottom sheets
 * - Mobile (<768px): Full-screen slides, 50/50 split for Track
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { CommandProvider, useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Timer, Edit, BarChart2, Plus, Github, Play, Pause, Square, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DebugButton, RuntimeDebugPanel } from '../workout/RuntimeDebugPanel';
import { CommitGraph } from '../ui/CommitGraph';
import { parseDocumentStructure, DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { MetricsProvider } from '../../services/MetricsContext';
import { SlidingViewport, ViewMode } from './SlidingViewport';
import { TimerIndexPanel } from './TimerIndexPanel';
import { AnalyticsIndexPanel } from './AnalyticsIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { cn, hashCode } from '../../lib/utils';

// Define Segment interface locally since GitTreeSidebar is deleted
interface Segment {
  id: number;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  parentId: number | null;
  depth: number;
  avgPower: number;
  avgHr: number;
  lane: number;
}
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeProvider, useRuntime } from './RuntimeProvider';
import { RuntimeFactory } from '../../runtime/RuntimeFactory';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useWorkoutEvents } from '../../hooks/useWorkoutEvents';
import { WorkoutEvent } from '../../services/WorkoutEventBus';

// Runtime imports
// Runtime imports
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { NextEvent } from '../../runtime/NextEvent';

// Create singleton factory instance
const runtimeFactory = new RuntimeFactory(globalCompiler);

export interface UnifiedWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
}

// --- Analytics Data Transformation ---
const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null) => {
  if (!runtime) return { data: [], segments: [] };

  const segments: Segment[] = [];
  const data: any[] = [];
  
  // 1. Convert ExecutionRecords to Segments
  // We need to establish a timeline. 
  // If the workout hasn't started, return empty.
  if (runtime.executionLog.length === 0 && runtime.stack.blocks.length === 0) {
    return { data: [], segments: [] };
  }

  // Combine completed log and active stack
  const allRecords = [
    ...runtime.executionLog,
    ...runtime.stack.blocks.map((b, i) => ({
      id: b.key.toString(),
      label: b.label || b.blockType || 'Block',
      type: b.blockType || 'unknown',
      startTime: Date.now(), // This is tricky for active blocks without stored start time
      endTime: undefined,
      parentId: i > 0 ? runtime.stack.blocks[i-1].key.toString() : null,
      depth: i,
      metrics: []
    }))
  ];

  // We need a consistent start time for the timeline
  // Find the earliest start time
  let workoutStartTime = Date.now();
  if (runtime.executionLog.length > 0) {
    workoutStartTime = Math.min(...runtime.executionLog.map(r => r.startTime));
  }

  // Sort by start time
  allRecords.sort((a, b) => a.startTime - b.startTime);

  // Map IDs to depth for hierarchy
  const idToDepth = new Map<string, number>();
  
  allRecords.forEach(record => {
    // Calculate depth
    let depth = 0;
    // For active blocks, we might have parentId from stack structure
    // For log records, we have parentId
    if (record.parentId && idToDepth.has(record.parentId)) {
      depth = (idToDepth.get(record.parentId) || 0) + 1;
    }
    idToDepth.set(record.id, depth);

    // Calculate duration
    const endTime = record.endTime || Date.now();
    const duration = (endTime - record.startTime) / 1000;
    
    // Extract power/hr from metrics if available (mocking for now if not)
    // Real metrics would come from record.metrics
    let avgPower = 0;
    let avgHr = 0;
    
    // Try to find resistance/effort metrics
    if (record.metrics) {
      const resistance = record.metrics.find(m => m.values.some(v => v.type === 'resistance'));
      if (resistance) {
        const val = resistance.values.find(v => v.type === 'resistance');
        if (val && val.value) avgPower = val.value;
      }
    }

    segments.push({
      id: hashCode(record.id), // Use hash for numeric ID required by Segment interface
      name: record.label,
      type: record.type,
      startTime: (record.startTime - workoutStartTime) / 1000,
      endTime: (endTime - workoutStartTime) / 1000,
      duration: duration,
      parentId: record.parentId ? hashCode(record.parentId) : null,
      depth: depth,
      avgPower: avgPower,
      avgHr: avgHr,
      lane: depth
    });
  });

  // 2. Generate Time Series Data (Synthetic for now, based on segments)
  // In a real app, this would come from a continuous telemetry log
  const totalDuration = segments.length > 0 
    ? Math.max(...segments.map(s => s.endTime)) 
    : 0;

  for (let t = 0; t <= totalDuration; t++) {
    // Find active segments at this second
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);
    
    // Base values
    let power = 0;
    let hr = 60;
    
    // If inside a "work" or "interval" segment, boost values
    const workSeg = activeSegs.find(s => ['work', 'interval', 'ramp'].includes(s.type.toLowerCase()));
    if (workSeg) {
      power = workSeg.avgPower || 200; // Default to 200 if no metric
      hr = 140;
    } else if (activeSegs.some(s => ['warmup', 'cooldown', 'rest'].includes(s.type.toLowerCase()))) {
      power = 100;
      hr = 100;
    }

    // Add some noise
    power += (Math.random() - 0.5) * 20;
    hr += (Math.random() - 0.5) * 5;

    data.push({
      time: t,
      power: Math.max(0, Math.round(power)),
      hr: Math.round(hr),
      cadence: power > 0 ? 80 + (Math.random() * 10) : 0
    });
  }

  return { data, segments };
};

// --- Timer Display Component ---
const TimerDisplay: React.FC<{ 
  elapsedMs: number; 
  hasActiveBlock: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  isRunning: boolean;
  compact?: boolean;
}> = ({ elapsedMs, hasActiveBlock, onStart, onPause, onStop, onNext, isRunning, compact = false }) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center h-full',
      compact ? 'gap-4' : 'gap-8'
    )}>
      {!compact && (
        <h2 className="text-2xl font-bold text-muted-foreground">Workout Timer</h2>
      )}
      
      <div className={cn(
        'font-mono font-bold tabular-nums tracking-wider',
        compact ? 'text-4xl' : 'text-8xl',
        hasActiveBlock ? 'text-primary' : 'text-muted-foreground/20'
      )}>
        {hasActiveBlock ? formatTime(elapsedMs) : '--:--.--'}
      </div>
      
      {hasActiveBlock ? (
        <div className={cn('flex', compact ? 'gap-3' : 'gap-6')}>
          {!isRunning ? (
            <Button onClick={onStart} size={compact ? 'default' : 'lg'} className={cn(
              'rounded-full bg-green-600 hover:bg-green-700',
              compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
            )}>
              <Play className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
            </Button>
          ) : (
            <Button onClick={onPause} size={compact ? 'default' : 'lg'} className={cn(
              'rounded-full bg-yellow-600 hover:bg-yellow-700',
              compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
            )}>
              <Pause className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
            </Button>
          )}
          
          <Button onClick={onNext} size={compact ? 'default' : 'lg'} className={cn(
            'rounded-full bg-blue-600 hover:bg-blue-700',
            compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
          )}>
            <SkipForward className={cn('fill-current', compact ? 'h-5 w-5' : 'h-8 w-8')} />
          </Button>

          <Button onClick={onStop} size={compact ? 'default' : 'lg'} variant="destructive" className={cn(
            'rounded-full',
            compact ? 'h-12 w-12 p-0' : 'h-16 w-16 p-0'
          )}>
            <Square className={cn('fill-current', compact ? 'h-4 w-4' : 'h-6 w-6')} />
          </Button>
        </div>
      ) : (
        <div className={cn(
          'p-4 rounded-lg border border-border bg-card text-center',
          compact ? 'max-w-[200px]' : 'max-w-md'
        )}>
          <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
            {compact ? 'Select a workout to begin' : 'Select a WOD block from the index to begin tracking.'}
          </p>
        </div>
      )}
    </div>
  );
};

// --- Main Workbench Content ---
const UnifiedWorkbenchContent: React.FC<UnifiedWorkbenchProps> = ({
  initialContent,
  theme: propTheme,
  ...editorProps
}) => {
  const { theme, setTheme } = useTheme();
  const { setIsOpen, setStrategy } = useCommandPalette();
  
  // Consume Workbench Context (document state, view mode)
  const {
    content,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout
  } = useWorkbench();

  // Consume Runtime Context (decoupled runtime management)
  const { runtime, initializeRuntime, disposeRuntime } = useRuntime();

  // Local UI state
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate document structure (still used for Track/Analyze views)
  const documentItems = useMemo(() => {
    return parseDocumentStructure(content, blocks);
  }, [content, blocks]);

  // Update active block ID based on cursor
  useEffect(() => {
    const item = documentItems.find(item =>
      cursorLine >= item.startLine && cursorLine <= item.endLine
    );
    setActiveBlockId(item?.id || null);
  }, [documentItems, cursorLine, setActiveBlockId]);

  // Selected block object
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Initialize runtime when entering track view with selected block
  // This replaces the old useEffect in WorkbenchContext
  useEffect(() => {
    if (selectedBlock && selectedBlock.statements && viewMode === 'track') {
      console.log('[UnifiedWorkbench] Initializing runtime for block:', selectedBlock.id);
      initializeRuntime(selectedBlock);
    } else if (viewMode !== 'track') {
      // Dispose runtime when leaving track view
      disposeRuntime();
    }
  }, [selectedBlockId, viewMode, selectedBlock, initializeRuntime, disposeRuntime]);

  // Execution hook
  const execution = useRuntimeExecution(runtime);

  // Real Analytics Data from Runtime
  // We use state + effect to persist data even after runtime is disposed (e.g. on stop)
  const [analyticsState, setAnalyticsState] = useState<{data: any[], segments: Segment[]}>({ data: [], segments: [] });

  useEffect(() => {
    if (runtime) {
      // Only update when execution state changes significantly (e.g. paused, stopped, or periodically)
      // For live updates, we might want to throttle this or rely on execution.stepCount
      const newState = transformRuntimeToAnalytics(runtime);
      setAnalyticsState(newState);
    }
  }, [runtime, execution.stepCount, execution.status]);

  const { data: analyticsData, segments: analyticsSegments } = analyticsState;

  const [selectedAnalyticsIds, setSelectedAnalyticsIds] = useState(new Set<number>());

  // Active segment/statement IDs for highlighting
  const activeSegmentIds = useMemo(() => {
    if (!runtime || viewMode !== 'track') return new Set<number>();
    return new Set(runtime.stack.blocks.map(block => hashCode(block.key.toString())));
  }, [runtime, execution.stepCount, viewMode]);

  const activeStatementIds = useMemo(() => {
    if (!runtime || viewMode !== 'track') return new Set<number>();
    const ids = new Set<number>();
    runtime.stack.blocks.forEach(block => {
      if (block.sourceIds) {
        block.sourceIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [runtime, execution.stepCount, viewMode]);

  // Sync theme
  useEffect(() => {
    if (!propTheme) return;
    const targetTheme = (propTheme === 'vs-dark' || propTheme === 'wod-dark') ? 'dark' : 'light';
    if (theme !== 'system' && theme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [propTheme]);

  // Monaco theme
  const monacoTheme = useMemo(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme === 'system') {
      return mediaQuery.matches ? 'wod-dark' : 'wod-light';
    }
    return theme === 'dark' ? 'wod-dark' : 'wod-light';
  }, [theme]);

  // Block editor hooks
  const { editStatement, deleteStatement } = useBlockEditor({
    editor: editorInstance,
    block: selectedBlock
  });

  // Handlers
  const handleEditorMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };

  const handleBlockClick = (item: DocumentItem) => {
    if (item.type === 'wod') {
      selectBlock(item.id);
    }

    if (viewMode === 'plan' && editorInstance) {
      const line = item.startLine + 1;
      editorInstance.revealLineInCenter(line);
      editorInstance.setPosition({ lineNumber: line, column: 1 });
      editorInstance.focus();
      setHighlightedLine(line);
      setTimeout(() => setHighlightedLine(null), 2000);
    }
  };

  // Handle start workout - now can be triggered via event bus OR callback
  const handleStartWorkoutAction = useCallback((block: WodBlock) => {
    console.log('[UnifiedWorkbench] handleStartWorkoutAction called for block:', block.id);
    startWorkout(block);
  }, [startWorkout]);

  // Subscribe to workout events via event bus
  // This is the primary mechanism - the callback prop is for backward compatibility
  const handleWorkoutEvent = useCallback((event: WorkoutEvent) => {
    console.log('[UnifiedWorkbench] Received workout event:', event.type);
    switch (event.type) {
      case 'start-workout':
        handleStartWorkoutAction(event.block);
        break;
      case 'stop-workout':
        completeWorkout(event.results);
        break;
      case 'pause-workout':
        execution.pause();
        break;
      case 'resume-workout':
        execution.start();
        break;
      case 'next-segment':
        if (runtime) {
          runtime.handle(new NextEvent());
          execution.step();
        }
        break;
    }
  }, [handleStartWorkoutAction, completeWorkout, execution, runtime]);

  // Subscribe to workout events
  useWorkoutEvents(handleWorkoutEvent, [handleWorkoutEvent]);

  const handleComplete = () => {
    completeWorkout({
        startTime: execution.startTime || Date.now(),
        endTime: Date.now(),
        duration: execution.elapsedTime,
        metrics: [],
        completed: true
    });
  };

  const handleSelectAnalyticsSegment = (id: number) => {
    const newSet = new Set(selectedAnalyticsIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAnalyticsIds(newSet);
  };

  const handleStart = () => execution.start();
  const handlePause = () => execution.pause();
  const handleStop = () => {
    execution.stop();
    handleComplete();
  };
  const handleNext = () => {
    if (runtime) {
      runtime.handle(new NextEvent());
      execution.step();
    }
  };

  // --- Panel Components ---
  
  // Plan view: Just the Monaco Editor (full width, no index panel)
  // WOD blocks get inline visualization through Monaco view zones
  const planPanel = (
    <div ref={editorContainerRef} className="h-full w-full">
      <MarkdownEditorBase
        initialContent={initialContent}
        showContextOverlay={false}
        onActiveBlockChange={(block) => setActiveBlockId(block?.id || null)}
        onBlocksChange={setBlocks}
        onContentChange={setContent}
        onCursorPositionChange={setCursorLine}
        highlightedLine={highlightedLine}
        onMount={handleEditorMount}
        onStartWorkout={handleStartWorkoutAction}
        height="100%"
        {...editorProps}
        theme={monacoTheme}
      />
    </div>
  );

  // Track Index: TimerIndexPanel
  const trackIndexPanel = (
    <TimerIndexPanel
      runtime={runtime}
      activeBlock={selectedBlock}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      autoScroll={execution.status === 'running'}
      mobile={isMobile}
      workoutStartTime={execution.startTime}
    />
  );

  // Track Primary: Timer Display
  const trackPrimaryPanel = (
    <TimerDisplay
      elapsedMs={execution.elapsedTime}
      hasActiveBlock={!!selectedBlock}
      onStart={handleStart}
      onPause={handlePause}
      onStop={handleStop}
      onNext={handleNext}
      isRunning={execution.status === 'running'}
      compact={isMobile}
    />
  );

  // Track Debug: RuntimeDebugPanel (embedded, not slide-out)
  const trackDebugPanel = (
    <RuntimeDebugPanel
      runtime={runtime}
      isOpen={true}
      onClose={() => setIsDebugMode(false)}
      embedded={true}
    />
  );

  // Analyze Index: AnalyticsIndexPanel
  const analyzeIndexPanel = (
    <AnalyticsIndexPanel
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
      mobile={isMobile}
    />
  );

  // Analyze Primary: TimelineView
  const analyzePrimaryPanel = (
    <TimelineView
      rawData={analyticsData}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
    />
  );

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Header / Navigation */}
        <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
          <div className="font-bold flex items-center gap-4">
            <div className={cn('h-10 flex items-center', isMobile ? 'w-[150px]' : 'w-[300px]')}>
              <CommitGraph
                text={isMobile ? 'WOD.WIKI' : 'WOD.WIKI++'}
                rows={16}
                cols={isMobile ? 60 : 90}
                gap={1}
                padding={0}
                fontScale={0.8}
                fontWeight={200}
                letterSpacing={1.6}
              />
            </div>
            {!isMobile && (
              <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {viewMode.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Debug Button - Always visible, to the left */}
            {!isMobile && (
              <DebugButton
                isDebugMode={isDebugMode}
                onClick={() => setIsDebugMode(!isDebugMode)}
              />
            )}
            
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStrategy(null);
                  setIsOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

            {/* View Mode Buttons */}
            <Button
              variant={viewMode === 'plan' ? 'default' : 'ghost'}
              size={isMobile ? 'icon' : 'sm'}
              onClick={() => setViewMode('plan')}
              className={cn('gap-2', viewMode !== 'plan' && 'text-muted-foreground hover:text-foreground')}
            >
              <Edit className="h-4 w-4" />
              {!isMobile && 'Plan'}
            </Button>
            <Button
              variant={viewMode === 'track' ? 'default' : 'ghost'}
              size={isMobile ? 'icon' : 'sm'}
              onClick={() => setViewMode('track')}
              className={cn('gap-2', viewMode !== 'track' && 'text-muted-foreground hover:text-foreground')}
            >
              <Timer className="h-4 w-4" />
              {!isMobile && 'Track'}
            </Button>
            <Button
              variant={viewMode === 'analyze' ? 'default' : 'ghost'}
              size={isMobile ? 'icon' : 'sm'}
              onClick={() => setViewMode('analyze')}
              className={cn('gap-2', viewMode !== 'analyze' && 'text-muted-foreground hover:text-foreground')}
            >
              <BarChart2 className="h-4 w-4" />
              {!isMobile && 'Analyze'}
            </Button>

            <div className="h-6 w-px bg-border mx-2" />

            <ThemeToggle />
            {!isMobile && (
              <a
                href="https://github.com/SergeiGolos/wod-wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors ml-2"
                title="Check us out on GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Main Content - Sliding Viewport */}
        <div className="flex-1 overflow-hidden">
          <SlidingViewport
            currentView={viewMode}
            onViewChange={setViewMode}
            planPanel={planPanel}
            trackIndexPanel={trackIndexPanel}
            trackPrimaryPanel={trackPrimaryPanel}
            trackDebugPanel={trackDebugPanel}
            analyzeIndexPanel={analyzeIndexPanel}
            analyzePrimaryPanel={analyzePrimaryPanel}
            isDebugMode={isDebugMode}
          />
        </div>
      </div>
      <CommandPalette />
    </>
  );
};

// --- Exported Component with Providers ---
export const UnifiedWorkbench: React.FC<UnifiedWorkbenchProps> = (props) => {
  const defaultTheme = useMemo(() => {
    if (props.theme === 'vs-dark' || props.theme === 'wod-dark') return 'dark';
    if (props.theme === 'vs' || props.theme === 'wod-light') return 'light';
    return 'dark';
  }, [props.theme]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey="wod-wiki-theme">
      <MetricsProvider>
        <CommandProvider>
          <WorkbenchProvider initialContent={props.initialContent}>
            <RuntimeProvider factory={runtimeFactory}>
              <UnifiedWorkbenchContent {...props} />
            </RuntimeProvider>
          </WorkbenchProvider>
        </CommandProvider>
      </MetricsProvider>
    </ThemeProvider>
  );
};

export default UnifiedWorkbench;
