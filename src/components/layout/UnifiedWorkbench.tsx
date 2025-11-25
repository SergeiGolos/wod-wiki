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

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { EditorIndexPanel } from './EditorIndexPanel';
import { TimerIndexPanel } from './TimerIndexPanel';
import { AnalyticsIndexPanel } from './AnalyticsIndexPanel';
import { TimelineView } from '../../timeline/TimelineView';
import { Segment } from '../../timeline/GitTreeSidebar';
import { cn, hashCode } from '../../lib/utils';

// Runtime imports
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { WodScript } from '../../parser/WodScript';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { NextEvent } from '../../runtime/NextEvent';

export interface UnifiedWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
}

// --- Mock Analytics Data Generation ---
const generateSessionData = () => {
  const data: any[] = [];
  const segments: Segment[] = [];
  const totalDuration = 1200;

  const noise = (amp: number) => (Math.random() - 0.5) * amp;

  for (let t = 0; t <= totalDuration; t++) {
    let targetPower = 100;
    
    if (t > 300 && t < 900) {
      targetPower = 200;
      if ((t - 300) % 180 < 120) targetPower = 280;
      else targetPower = 120;
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
      lane: depth
    };
    segments.push(segment);
    return segment.id;
  };

  const rootId = addSeg("Full Session", 0, totalDuration, "root", null, 0);
  const wuId = addSeg("Warmup", 0, 300, "warmup", rootId, 1);
  addSeg("Spin Up", 200, 280, "ramp", wuId, 2);

  const mainId = addSeg("Main Set", 300, 900, "work", rootId, 1);
  for (let i = 0; i < 3; i++) {
    const start = 300 + (i * 180);
    addSeg(`Interval ${i+1}`, start, start + 120, "interval", mainId, 2);
    addSeg(`Recovery ${i+1}`, start + 120, start + 180, "rest", mainId, 2);
  }
  addSeg(`Interval 4`, 840, 900, "interval", mainId, 2);
  addSeg("Cooldown", 900, totalDuration, "cooldown", rootId, 1);

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
  initialContent = "# My Workout\n\n```wod\nTimer: 10:00\n  - 10 Pushups\n  - 10 Situps\n```\n",
  theme: propTheme,
  ...editorProps
}) => {
  const { theme, setTheme } = useTheme();
  const { setIsOpen, setStrategy } = useCommandPalette();
  
  // Editor state
  const [, setActiveBlock] = useState<WodBlock | null>(null);
  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [cursorLine, setCursorLine] = useState(1);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate document structure
  const documentItems = useMemo(() => {
    return parseDocumentStructure(content, blocks);
  }, [content, blocks]);

  // Active block ID from cursor
  const activeBlockId = useMemo(() => {
    const item = documentItems.find(item =>
      cursorLine >= item.startLine && cursorLine <= item.endLine
    );
    return item?.id;
  }, [documentItems, cursorLine]);

  // Auto-expand WOD blocks when cursor enters them in plan mode
  useEffect(() => {
    if (viewMode === 'plan' && activeBlockId) {
      const activeItem = documentItems.find(item => item.id === activeBlockId);
      if (activeItem?.type === 'wod') {
        setExpandedBlockId(activeBlockId);
      }
    }
  }, [activeBlockId, viewMode, documentItems]);

  // Selected block object
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // Analytics data (mock)
  const { data: analyticsData, segments: analyticsSegments } = useMemo(() => generateSessionData(), []);
  const [selectedAnalyticsIds, setSelectedAnalyticsIds] = useState(new Set([5, 7, 9, 11]));

  // Runtime state
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);

  // Initialize Runtime when selected block changes and we're in track mode
  useEffect(() => {
    if (selectedBlock && selectedBlock.statements && viewMode === 'track') {
      const script = new WodScript(selectedBlock.content, selectedBlock.statements);
      const newRuntime = new ScriptRuntime(script, globalCompiler);
      
      const rootBlock = globalCompiler.compile(selectedBlock.statements as any, newRuntime);
      
      if (rootBlock) {
        console.log('🚀 Initializing runtime with root block:', rootBlock.key.toString());
        newRuntime.stack.push(rootBlock);
        const actions = rootBlock.mount(newRuntime);
        actions.forEach(action => action.do(newRuntime));
      }

      setRuntime(newRuntime);
    } else if (viewMode !== 'track') {
      setRuntime(null);
    }
  }, [selectedBlockId, selectedBlock?.content, viewMode]);

  // Execution hook
  const execution = useRuntimeExecution(runtime);

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
      return mediaQuery.matches ? 'vs-dark' : 'vs';
    }
    return theme === 'dark' ? 'vs-dark' : 'vs';
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
      setSelectedBlockId(item.id);
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

  const handleStartWorkout = (block: WodBlock) => {
    setSelectedBlockId(block.id);
    setViewMode('track');
  };

  const handleComplete = () => {
    setViewMode('analyze');
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
  
  // Plan Primary: Monaco Editor
  const planPrimaryPanel = (
    <div ref={editorContainerRef} className="h-full w-full">
      <MarkdownEditorBase
        initialContent={initialContent}
        showContextOverlay={false}
        onActiveBlockChange={setActiveBlock}
        onBlocksChange={setBlocks}
        onContentChange={setContent}
        onCursorPositionChange={setCursorLine}
        highlightedLine={highlightedLine}
        onMount={handleEditorMount}
        height="100%"
        {...editorProps}
        theme={monacoTheme}
      />
    </div>
  );

  // Plan Index: EditorIndexPanel
  const planIndexPanel = (
    <EditorIndexPanel
      items={documentItems}
      activeBlockId={activeBlockId}
      expandedBlockId={expandedBlockId}
      onBlockClick={handleBlockClick}
      onExpandChange={setExpandedBlockId}
      onStartWorkout={handleStartWorkout}
      onEditStatement={(_blockId, index, text) => editStatement?.(index, text)}
      onDeleteStatement={(_blockId, index) => deleteStatement?.(index)}
      mobile={isMobile}
    />
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
            planPrimaryPanel={planPrimaryPanel}
            planIndexPanel={planIndexPanel}
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
          <UnifiedWorkbenchContent {...props} />
        </CommandProvider>
      </MetricsProvider>
    </ThemeProvider>
  );
};

export default UnifiedWorkbench;
