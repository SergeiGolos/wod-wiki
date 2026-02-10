/**
 * UnifiedWorkbench - Responsive workbench combining desktop and mobile views
 * 
 * This component implements the "sliding viewport" model where the app is a
 * viewport sliding across a horizontal strip of panels:
 * 
 * PLAN:    [Editor 2/3][EditorIndex 1/3]
 * TRACK:   [Timer 2/3][TimerIndex 1/3]
 * REVIEW:  [AnalyticsIndex 1/3][Timeline 2/3]
 * 
 * Responsive behavior:
 * - Desktop (≥1024px): Full sliding strip with side-by-side panels
 * - Tablet (768-1024px): Stacked with bottom sheets
 * - Mobile (<768px): Full-screen slides, 50/50 split for Track
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { CommandProvider, useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Plus, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { AudioProvider } from '../audio/AudioContext';
import { AudioToggle } from '../audio/AudioToggle';
import { DebugButton, RuntimeDebugPanel } from '../workout/RuntimeDebugPanel';
import { CommitGraph } from '../ui/CommitGraph';
import { parseDocumentStructure } from '../../markdown-editor/utils/documentStructure';
import { ResponsiveViewport } from './panel-system/ResponsiveViewport';
import { createPlanView, createTrackView, createReviewView, createHistoryView, createAnalyzeView } from './panel-system/viewDescriptors';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import { cn, hashCode } from '../../lib/utils';
import { AnalyticsGroup, Segment } from '../../core/models/AnalyticsModels';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeLifecycleProvider } from './RuntimeLifecycleProvider';
import { RuntimeFactory } from '../../runtime/compiler/RuntimeFactory';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getAnalyticsFromRuntime, AnalyticsDataPoint } from '../../services/AnalyticsTransformer';
import type { ContentProviderMode, IContentProvider } from '../../types/content-provider';

import { useWorkbenchRuntime } from '../workbench/useWorkbenchRuntime';
import { useCreateWorkoutEntry } from '../../hooks/useCreateWorkoutEntry';
import { PlanPanel } from '../workbench/PlanPanel';
import { TrackPanelIndex, TrackPanelPrimary } from '../workbench/TrackPanel';
import { ReviewPanelIndex, ReviewPanelPrimary } from '../workbench/ReviewPanel';
import { HistoryPanel } from '../workbench/HistoryPanel';
import { AnalyzePanel } from '../workbench/AnalyzePanel';

// Create singleton factory instance
const runtimeFactory = new RuntimeFactory(globalCompiler);

export interface UnifiedWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
}

// --- Main Workbench Content ---
const UnifiedWorkbenchContent: React.FC<UnifiedWorkbenchProps> = ({
  initialContent,
  theme: propTheme,
  ...editorProps
}) => {
  const { theme, setTheme } = useTheme();
  const { setIsOpen, setStrategy } = useCommandPalette();

  // Consume Workbench Context (document state, view mode, panel layouts)
  const {
    content,
    blocks,
    activeBlockId: _activeBlockId,
    selectedBlockId,
    viewMode,
    results: _results,
    panelLayouts,
    contentMode,
    stripMode,
    historySelection,
    historyEntries,
    provider,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock: _selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    expandPanel,
    collapsePanel,
    setHistoryEntries,
  } = useWorkbench();

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

  // Use create workout entry hook
  const { createNewEntry, canCreate } = useCreateWorkoutEntry({
    provider,
    historySelection,
    setHistoryEntries,
    setViewMode,
    setContent,
  });

  // Load history entries on mount when in history mode
  useEffect(() => {
    if (contentMode === 'history') {
      provider.getEntries().then(entries => {
        setHistoryEntries(entries);
      }).catch(err => {
        console.error('Failed to load history entries:', err);
      });
    }
  }, [contentMode, provider, setHistoryEntries]);

  // Initialize runtime when entering track view with selected block
  // Use a ref to prevent re-initialization loops if selectedBlock reference changes but ID is same
  const lastInitializedBlockIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode === 'track' && selectedBlock && selectedBlock.statements) {
      // Only initialize if we haven't initialized this block ID yet
      // OR if we are switching back to track mode
      if (lastInitializedBlockIdRef.current !== selectedBlock.id) {
        initializeRuntime(selectedBlock);
        lastInitializedBlockIdRef.current = selectedBlock.id;
      }
    } else if (viewMode !== 'track') {
      if (lastInitializedBlockIdRef.current !== null) {
        disposeRuntime();
        lastInitializedBlockIdRef.current = null;
      }
    }
  }, [viewMode, selectedBlockId, selectedBlock, initializeRuntime, disposeRuntime]);

  // Screen Wake Lock - keep screen awake when in track mode and workout is running
  // This prevents the phone screen from dimming/locking during active workouts
  useWakeLock({
    enabled: viewMode === 'track' && execution.status === 'running'
  });

  // Real Analytics Data from Runtime
  // We use state + effect to persist data even after runtime is disposed (e.g. on stop)
  const [analyticsState, setAnalyticsState] = useState<{ data: AnalyticsDataPoint[], segments: Segment[], groups: AnalyticsGroup[] }>({ data: [], segments: [], groups: [] });

  const lastAnalyticsUpdateRef = useRef(0);
  const lastStatusRef = useRef(execution.status);

  useEffect(() => {
    if (runtime) {
      const now = Date.now();
      const statusChanged = execution.status !== lastStatusRef.current;
      const shouldUpdate = statusChanged || (now - lastAnalyticsUpdateRef.current > 1000);

      if (shouldUpdate) {
        const newState = getAnalyticsFromRuntime(runtime);
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

  // Review Index: AnalyticsIndexPanel
  const reviewIndexPanel = (
    <ReviewPanelIndex
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
      mobile={isMobile}
      groups={analyticsGroups}
    />
  );

  // Review Primary: TimelineView
  const reviewPrimaryPanel = (
    <ReviewPanelPrimary
      rawData={analyticsData}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={handleSelectAnalyticsSegment}
      groups={analyticsGroups}
    />
  );

  // --- History & Analyze Panels (only for history mode) ---
  const historyBrowserPanel = contentMode === 'history' && historySelection ? (
    <HistoryPanel
      span={stripMode === 'history-only' ? 3 : 1}
      entries={historyEntries}
      selectedIds={historySelection.selectedIds}
      onToggleEntry={historySelection.toggleEntry}
      onSelectAll={historySelection.selectAll}
      onClearSelection={historySelection.clearSelection}
      calendarDate={historySelection.calendarDate}
      onCalendarDateChange={historySelection.setCalendarDate}
      stripMode={stripMode}
      onCreateNewEntry={createNewEntry}
      canCreate={canCreate}
    />
  ) : null;

  const historySelectedIds = historySelection?.selectedIds;
  const selectedEntries = useMemo(() => {
    if (!historySelectedIds) return [];
    return historyEntries.filter(e => historySelectedIds.has(e.id));
  }, [historyEntries, historySelectedIds]);

  const analyzePanelContent = contentMode === 'history' ? (
    <AnalyzePanel selectedEntries={selectedEntries} />
  ) : null;

  // --- Build View Descriptors ---
  const viewDescriptors = useMemo(() => {
    if (contentMode === 'static') {
      // Static mode: Plan | Track | Review (unchanged)
      return [
        createPlanView(planPanel),
        createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode),
        createReviewView(reviewIndexPanel, reviewPrimaryPanel),
      ];
    }

    // History mode: strip depends on selection mode
    switch (stripMode) {
      case 'history-only':
        return [
          createHistoryView(historyBrowserPanel, stripMode),
        ];
      case 'single-select':
        return [
          createHistoryView(historyBrowserPanel, stripMode),
          createPlanView(planPanel),
          createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode),
          createReviewView(reviewIndexPanel, reviewPrimaryPanel),
        ];
      case 'multi-select':
        return [
          createHistoryView(historyBrowserPanel, stripMode),
          createAnalyzeView(analyzePanelContent),
        ];
      default:
        return [
          createPlanView(planPanel),
          createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode),
          createReviewView(reviewIndexPanel, reviewPrimaryPanel),
        ];
    }
  }, [
    contentMode,
    stripMode,
    planPanel,
    trackPrimaryPanel,
    trackIndexPanel,
    trackDebugPanel,
    isDebugMode,
    reviewIndexPanel,
    reviewPrimaryPanel,
    historyBrowserPanel,
    analyzePanelContent,
  ]);

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
                aria-label="Open command palette"
                title="Open command palette"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

            {/* View Mode Buttons — dynamically built from current viewDescriptors */}
            {viewDescriptors.map(view => (
              <Button
                key={view.id}
                variant={viewMode === view.id ? 'default' : 'ghost'}
                size={isMobile ? 'icon' : 'sm'}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={cn('gap-2', viewMode !== view.id && 'text-muted-foreground hover:text-foreground')}
                aria-label={isMobile ? `Switch to ${view.label} view` : undefined}
                title={isMobile ? `Switch to ${view.label} view` : undefined}
              >
                {view.icon}
                {!isMobile && view.label}
              </Button>
            ))}

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
                aria-label="Visit WOD Wiki on GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Main Content - Responsive Viewport */}
        <div className="flex-1 overflow-hidden">
          <ResponsiveViewport
            views={viewDescriptors}
            currentView={viewMode}
            onViewChange={setViewMode}
            panelLayouts={panelLayouts}
            onExpandPanel={expandPanel}
            onCollapsePanel={collapsePanel}
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
      <CommandProvider>
        <WorkbenchProvider initialContent={props.initialContent} mode={props.mode} provider={props.provider}>
          <AudioProvider>
            <RuntimeLifecycleProvider factory={runtimeFactory}>
              <UnifiedWorkbenchContent {...props} />
            </RuntimeLifecycleProvider>
          </AudioProvider>
        </WorkbenchProvider>
      </CommandProvider>
    </ThemeProvider>
  );
};

export default UnifiedWorkbench;
