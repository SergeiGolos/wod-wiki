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
import { AudioProvider } from '../audio/AudioContext';
import { AudioToggle } from '../audio/AudioToggle';
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
import { AnalyticsGroup, Segment } from '../../core/models/AnalyticsModels';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeProvider } from './RuntimeProvider';
import { RuntimeFactory } from '../../runtime/RuntimeFactory';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useWakeLock } from '../../hooks/useWakeLock';
import { AnalyticsTransformer, SegmentWithMetadata } from '../../services/AnalyticsTransformer';

import { useWorkbenchRuntime } from '../workbench/useWorkbenchRuntime';
import { PlanPanel } from '../workbench/PlanPanel';
import { TrackPanelIndex, TrackPanelPrimary } from '../workbench/TrackPanel';
import { AnalyzePanelIndex, AnalyzePanelPrimary } from '../workbench/AnalyzePanel';

// Create singleton factory instance
const runtimeFactory = new RuntimeFactory(globalCompiler);

export interface UnifiedWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
}

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

  const analyticsTransformer = useMemo(() => new AnalyticsTransformer(), []);

  // Local UI state
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
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

  // Use separated runtime hook
  const {
    runtime,
    initializeRuntime,
    disposeRuntime,
    execution,
    handleStart,
    handlePause,
    handleStop,
    handleNext,
    handleStartWorkoutAction
  } = useWorkbenchRuntime(viewMode, selectedBlock, completeWorkout, startWorkout);

  // Initialize runtime when entering track view with selected block
  useEffect(() => {
    if (selectedBlock && selectedBlock.statements && viewMode === 'track') {
      console.log('[UnifiedWorkbench] Initializing runtime for block:', selectedBlock.id);
      initializeRuntime(selectedBlock);
    } else if (viewMode !== 'track') {
      // Dispose runtime when leaving track view
      disposeRuntime();
    }
  }, [selectedBlockId, viewMode, selectedBlock, initializeRuntime, disposeRuntime]);

  // Screen Wake Lock - keep screen awake when in track mode and workout is running
  // This prevents the phone screen from dimming/locking during active workouts
  useWakeLock({
    enabled: viewMode === 'track' && execution.status === 'running'
  });

  // Real Analytics Data from Runtime
  // We use state + effect to persist data even after runtime is disposed (e.g. on stop)
  const [analyticsState, setAnalyticsState] = useState<{data: any[], segments: Segment[], groups: AnalyticsGroup[]}>({ data: [], segments: [], groups: [] });
  
  const lastAnalyticsUpdateRef = useRef(0);
  const lastStatusRef = useRef(execution.status);

  useEffect(() => {
    if (runtime) {
      const now = Date.now();
      const statusChanged = execution.status !== lastStatusRef.current;
      const shouldUpdate = statusChanged || (now - lastAnalyticsUpdateRef.current > 1000);

      if (shouldUpdate) {
        const newState = transformRuntimeToAnalytics(runtime); // TODO: Refactor to use AnalyticsTransformer and consolidate time series generation.
        setAnalyticsState(newState);
        lastAnalyticsUpdateRef.current = now;
        lastStatusRef.current = execution.status;
      }
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

  const handleSelectAnalyticsSegment = (id: number) => {
    const newSet = new Set(selectedAnalyticsIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAnalyticsIds(newSet);
  };

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

  // --- Panel Components ---

  // Plan view: Just the Monaco Editor (full width, no index panel)
  // WOD blocks get inline visualization through Monaco view zones
  const planPanel = (
    <PlanPanel
      initialContent={initialContent}
      onEditorMount={handleEditorMount}
      onStartWorkout={handleStartWorkoutAction}
      setActiveBlockId={setActiveBlockId}
      setBlocks={setBlocks}
      setContent={setContent}
      setCursorLine={setCursorLine}
      highlightedLine={highlightedLine}
      monacoTheme={monacoTheme}
      {...editorProps}
    />
  );

  // Track Index: TimerIndexPanel
  // Hide context panel when debugger is open (it's shown there instead)
  const trackIndexPanel = (
    <TrackPanelIndex
      runtime={runtime}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      hoveredBlockKey={hoveredBlockKey}
      isMobile={isMobile}
      execution={execution}
    />
  );

  // Track Primary: Timer Display
  const trackPrimaryPanel = (
    <TrackPanelPrimary
      runtime={runtime}
      execution={execution}
      selectedBlock={selectedBlock}
      isMobile={isMobile}
      documentItems={documentItems}
      activeBlockId={_activeBlockId || undefined}
      onBlockHover={handleBlockHover}
      onBlockClick={handleBlockClick}
      onSelectBlock={_selectBlock}
      onSetActiveBlockId={setActiveBlockId}
      onStart={handleStart}
      onPause={handlePause}
      onStop={handleStop}
      onNext={handleNext}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      hoveredBlockKey={hoveredBlockKey}
    />
  );

  // Track Debug: RuntimeDebugPanel (embedded, not slide-out)
  const trackDebugPanel = (
    <RuntimeDebugPanel
      runtime={runtime}
      isOpen={true}
      onClose={() => setIsDebugMode(false)}
      embedded={true}
      activeBlock={selectedBlock}
      activeStatementIds={activeStatementIds}
    />
  );

  // Analyze Index: AnalyticsIndexPanel
  const analyzeIndexPanel = (
    <AnalyzePanelIndex
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
      mobile={isMobile}
      groups={analyticsGroups}
    />
  );

  // Analyze Primary: TimelineView
  const analyzePrimaryPanel = (
    <AnalyzePanelPrimary
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

            <AudioToggle />
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
            <AudioProvider>
              <RuntimeProvider factory={runtimeFactory}>
                <UnifiedWorkbenchContent {...props} />
              </RuntimeProvider>
            </AudioProvider>
          </WorkbenchProvider>
        </CommandProvider>
      </MetricsProvider>
    </ThemeProvider>
  );
};

export default UnifiedWorkbench;
