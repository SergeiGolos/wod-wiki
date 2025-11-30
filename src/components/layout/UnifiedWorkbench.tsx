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
import { Timer, Edit, BarChart2, Plus, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { DebugButton, RuntimeDebugPanel } from '../workout/RuntimeDebugPanel';
import { CommitGraph } from '../ui/CommitGraph';
import { parseDocumentStructure } from '../../markdown-editor/utils/documentStructure';
import { MetricsProvider } from '../../services/MetricsContext';
import { SlidingViewport } from './SlidingViewport';
import { TimerIndexPanel } from './TimerIndexPanel';
import { WodIndexPanel } from './WodIndexPanel';
import { AnalyticsIndexPanel } from './AnalyticsIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { cn, hashCode } from '../../lib/utils';
import { TimerDisplay } from '../workout/TimerDisplay';
import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '../../core/models/AnalyticsModels';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeProvider, useRuntime } from './RuntimeProvider';
import { RuntimeProvider as ClockRuntimeProvider } from '../../runtime/context/RuntimeContext';
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
const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null): { data: any[], segments: Segment[], groups: AnalyticsGroup[] } => {
  if (!runtime) return { data: [], segments: [], groups: [] };

  const segments: Segment[] = [];
  const data: any[] = [];
  
  // 1. Convert ExecutionRecords to Segments
  // We need to establish a timeline. 
  // If the workout hasn't started, return empty.
  if (runtime.executionLog.length === 0 && runtime.stack.blocks.length === 0) {
    return { data: [], segments: [], groups: [] };
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
    
    // Extract metrics dynamically
    const metrics: Record<string, number> = {};
    
    if (record.metrics) {
      record.metrics.forEach(m => {
        m.values.forEach(v => {
          if (v.value !== undefined) {
            // Use the metric type as the key (e.g., 'power', 'heart_rate', 'cadence')
            // If multiple values of same type exist, we currently overwrite (could average instead)
            metrics[v.type] = v.value;
          }
        });
      });
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
      metrics: metrics,
      lane: depth
    });
  });

  // 2. Generate Time Series Data
  // In a real app, this would come from a continuous telemetry log.
  // Here we synthesize it based on the active segments at each second.
  const totalDuration = segments.length > 0 
    ? Math.max(...segments.map(s => s.endTime)) 
    : 0;

  // Identify all unique metric keys present in the segments to generate data for
  const availableMetricKeys = new Set<string>();
  segments.forEach(s => Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k)));
  
  // Ensure we always have at least basic metrics for the graph if nothing else
  if (availableMetricKeys.size === 0) {
    availableMetricKeys.add('power');
    availableMetricKeys.add('heart_rate');
  }

  for (let t = 0; t <= totalDuration; t++) {
    // Find active segments at this second
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);
    
    const dataPoint: any = { time: t };
    
    // For each available metric, calculate a value for this time point
    availableMetricKeys.forEach(key => {
      // Look for a segment that has this metric
      const segWithMetric = activeSegs.find(s => s.metrics[key] !== undefined);
      
      if (segWithMetric) {
        // Use the segment's average value + some noise
        const baseVal = segWithMetric.metrics[key];
        // Add 5% noise
        dataPoint[key] = Math.max(0, Math.round(baseVal + (Math.random() - 0.5) * (baseVal * 0.1)));
      } else {
        // Fallback/Default behavior if metric is missing in current segment but exists globally
        // e.g. Rest periods might drop power to 0 but keep HR high
        if (key === 'power' || key === 'resistance') {
          dataPoint[key] = 0;
        } else if (key === 'heart_rate') {
          // Decay HR if not specified
          const prevHr = data.length > 0 ? data[data.length - 1].heart_rate : 100;
          dataPoint[key] = Math.max(60, Math.round(prevHr * 0.99));
        } else {
          dataPoint[key] = 0;
        }
      }
    });

    // Ensure standard keys exist for TimelineView if they were added to availableMetricKeys
    // (TimelineView likely expects specific keys, or we need to update it too. 
    // Assuming TimelineView is generic or we map 'power'/'hr' correctly)
    
    data.push(dataPoint);
  }

  // 3. Generate Analytics Configuration
  // Scan segments for available metrics and create groups
  const groups: AnalyticsGroup[] = [];
  
  // Define standard metric configs
  const standardMetrics: Record<string, AnalyticsGraphConfig> = {
    'power': { id: 'power', label: 'Power', unit: 'W', color: '#8b5cf6', dataKey: 'power', icon: 'Zap' },
    'heart_rate': { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', dataKey: 'heart_rate', icon: 'Activity' },
    'cadence': { id: 'cadence', label: 'Cadence', unit: 'rpm', color: '#3b82f6', dataKey: 'cadence', icon: 'Wind' },
    'speed': { id: 'speed', label: 'Speed', unit: 'km/h', color: '#10b981', dataKey: 'speed', icon: 'Gauge' },
    'resistance': { id: 'resistance', label: 'Resistance', unit: 'kg', color: '#f59e0b', dataKey: 'resistance', icon: 'Dumbbell' },
  };

  // Create a "Performance" group for found metrics
  const performanceGraphs: AnalyticsGraphConfig[] = [];
  
  availableMetricKeys.forEach(key => {
    if (standardMetrics[key]) {
      performanceGraphs.push(standardMetrics[key]);
    } else {
      // Generic fallback for unknown metrics
      performanceGraphs.push({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        unit: '',
        color: '#888888',
        dataKey: key
      });
    }
  });

  if (performanceGraphs.length > 0) {
    groups.push({
      id: 'performance',
      name: 'Performance',
      graphs: performanceGraphs
    });
  }

  return { data, segments, groups };
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
    activeBlockId: _activeBlockId,
    selectedBlockId,
    viewMode,
    results: _results,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock: _selectBlock,
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
  
  // Block hover state (for highlighting in editor when hovering timer badges)
  const [hoveredBlockKey, setHoveredBlockKey] = useState<string | null>(null);
  
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
  const [analyticsState, setAnalyticsState] = useState<{data: any[], segments: Segment[], groups: AnalyticsGroup[]}>({ data: [], segments: [], groups: [] });

  useEffect(() => {
    if (runtime) {
      // Only update when execution state changes significantly (e.g. paused, stopped, or periodically)
      // For live updates, we might want to throttle this or rely on execution.stepCount
      const newState = transformRuntimeToAnalytics(runtime);
      setAnalyticsState(newState);
    }
  }, [runtime, execution.stepCount, execution.status]);

  const { data: analyticsData, segments: analyticsSegments, groups: analyticsGroups } = analyticsState;

  const [selectedAnalyticsIds, setSelectedAnalyticsIds] = useState(new Set<number>());

  // Active segment/statement IDs for highlighting
  const activeSegmentIds = useMemo(() => {
    if (!runtime || viewMode !== 'track') return new Set<number>();
    return new Set(runtime.stack.blocks.map(block => hashCode(block.key.toString())));
  }, [runtime, execution.stepCount, viewMode]);

  const activeStatementIds = useMemo(() => {
    if (!runtime || viewMode !== 'track') return new Set<number>();
    const ids = new Set<number>();
    
    // Only highlight the LEAF block (the one currently executing)
    // This avoids highlighting parent blocks (like "3 rounds") when a child is running
    // Only highlight the LEAF block (the one currently executing)
    // This avoids highlighting parent blocks (like "3 rounds") when a child is running
    const leafBlock = runtime.stack.current;
    if (leafBlock && leafBlock.sourceIds) {
      leafBlock.sourceIds.forEach(id => ids.add(id));
    }
    
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

  // Block editor hooks (may be needed for future editing capabilities)
  const { editStatement: _editStatement, deleteStatement: _deleteStatement } = useBlockEditor({
    editor: editorInstance,
    block: selectedBlock
  });

  // Handlers
  const handleEditorMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
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

  // Handle block hover from timer display (for highlighting in editor/index)
  const handleBlockHover = useCallback((blockKey: string | null) => {
    setHoveredBlockKey(blockKey);
  }, []);

  // Handle block click from timer display (navigate to block in editor)
  const handleBlockClick = useCallback((blockKey: string) => {
    // Find the block and navigate to it
    if (editorInstance && runtime) {
      const block = runtime.stack.blocks.find(b => b.key.toString() === blockKey);
      if (block?.sourceIds && block.sourceIds.length > 0) {
        // The sourceIds are statement IDs - try to find the line
        const statementId = block.sourceIds[0];
        // Look for the statement in the blocks
        for (const wodBlock of blocks) {
          const stmt = wodBlock.statements?.find(s => s.id === statementId);
          if (stmt && stmt.meta?.line) {
            const line = wodBlock.startLine + stmt.meta.line;
            editorInstance.revealLineInCenter(line);
            editorInstance.setPosition({ lineNumber: line, column: 1 });
            setHighlightedLine(line);
            setTimeout(() => setHighlightedLine(null), 2000);
            break;
          }
        }
      }
    }
  }, [editorInstance, runtime, blocks]);

  // Track Index: TimerIndexPanel
  const trackIndexPanel = (
    <TimerIndexPanel
      runtime={runtime}
      activeBlock={selectedBlock}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      highlightedBlockKey={hoveredBlockKey}
      autoScroll={execution.status === 'running'}
      mobile={isMobile}
      workoutStartTime={execution.startTime}
    />
  );

  // Track Primary: Timer Display
  // Wrap with ClockRuntimeProvider when runtime is available to enable display stack features
  const timerDisplay = (
    <TimerDisplay
      elapsedMs={execution.elapsedTime}
      hasActiveBlock={!!selectedBlock}
      onStart={handleStart}
      onPause={handlePause}
      onStop={handleStop}
      onNext={handleNext}
      isRunning={execution.status === 'running'}
      compact={isMobile}
      onBlockHover={handleBlockHover}
      onBlockClick={handleBlockClick}
      enableDisplayStack={!!runtime}
    />
  );
  
  const trackPrimaryPanel = runtime ? (
    <ClockRuntimeProvider runtime={runtime}>
      {timerDisplay}
    </ClockRuntimeProvider>
  ) : (
    selectedBlock ? timerDisplay : (
      <div className="h-full w-full bg-background p-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full border border-border rounded-lg shadow-sm bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-lg">Select a Workout</h3>
                <p className="text-sm text-muted-foreground">Choose a workout to start tracking</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                <WodIndexPanel
                    items={documentItems}
                    activeBlockId={_activeBlockId || undefined}
                    onBlockClick={(item) => {
                        if (item.type === 'wod') {
                            // Select the block - this will trigger runtime initialization via useEffect
                            // We use the exposed selectBlock from context (renamed to _selectBlock here)
                            // But wait, _selectBlock takes an ID?
                            // useWorkbench returns selectBlock: (blockId: string | null) => void
                            _selectBlock(item.id);
                        } else {
                            // Just highlight headers
                            setActiveBlockId(item.id);
                        }
                    }}
                    onBlockHover={handleBlockHover}
                    mobile={isMobile}
                />
            </div>
        </div>
      </div>
    )
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
      groups={analyticsGroups}
    />
  );

  // Analyze Primary: TimelineView
  const analyzePrimaryPanel = (
    <TimelineView
      rawData={analyticsData}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
      groups={analyticsGroups}
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
