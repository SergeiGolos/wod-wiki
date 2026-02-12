/**
 * Workbench - Responsive workbench combining desktop and mobile views
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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { CommandProvider, useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Github, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { AudioProvider } from '../audio/AudioContext';
import { AudioToggle } from '../audio/AudioToggle';
import { DebugButton, RuntimeDebugPanel } from '../workout/RuntimeDebugPanel';
import { CommitGraph } from '../ui/CommitGraph';
import { ResponsiveViewport } from './panel-system/ResponsiveViewport';
import { createPlanView, createTrackView, createReviewView, createHistoryView } from './panel-system/viewDescriptors';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import { cn } from '../../lib/utils';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeLifecycleProvider } from './RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from './WorkbenchSyncBridge';
import { useWorkbenchSync } from './useWorkbenchSync';
import { RuntimeFactory } from '../../runtime/compiler/RuntimeFactory';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import { workbenchEventBus } from '../../services/WorkbenchEventBus';

import { useCreateWorkoutEntry } from '../../hooks/useCreateWorkoutEntry';
import { PlanPanel } from '../workbench/PlanPanel';
import { SessionHistory, TimerScreen } from '../workbench/TrackPanel';
import { ReviewPanelIndex, ReviewPanelPrimary } from '../workbench/ReviewPanel';
import { ListFilter } from '../workbench/ListFilter';
import { ListOfNotes } from '../workbench/ListOfNotes';
import { NotePreview } from '../workbench/NotePreview';
import { AnalyzePanel } from '../workbench/AnalyzePanel';

// Create singleton factory instance
const runtimeFactory = new RuntimeFactory(globalCompiler);

export interface WorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
  initialActiveEntryId?: string;
  initialViewMode?: ViewMode;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
  commandStrategy?: any; // CommandStrategy - typed loosely to avoid deep imports issues if interface isn't exported well, but better to import it.
}

// --- Main Workbench Content ---
const WorkbenchContent: React.FC<WorkbenchProps> = ({
  initialContent,
  theme: propTheme,
  ...editorProps
}) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { setIsOpen, setStrategy } = useCommandPalette();

  // Register initial strategy if provided
  useEffect(() => {
    if (editorProps.commandStrategy) {
      setStrategy(editorProps.commandStrategy);
    }
  }, [editorProps.commandStrategy, setStrategy]);

  // Consume Workbench Context (document state, view mode, panel layouts)
  const {
    content,
    blocks,
    activeBlockId: _activeBlockId,
    selectedBlockId: _selectedBlockId,
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
    expandPanel,
    collapsePanel,
    setHistoryEntries,
  } = useWorkbench();

  // Consume synced state from Zustand store (via WorkbenchSyncBridge)
  const {
    runtime,
    execution,
    activeSegmentIds,
    activeStatementIds,
    hoveredBlockKey,
    setHoveredBlockKey,
    selectedBlock,
    documentItems,
    highlightedLine,
    setHighlightedLine,
    setCursorLine,
    analyticsData,
    analyticsSegments,
    analyticsGroups,
    selectedAnalyticsIds,
    toggleAnalyticsSegment,
    handleStart,
    handlePause,
    handleStop,
    handleNext,
    handleStartWorkoutAction,
  } = useWorkbenchSync();

  // Local UI state (not shared across panels)
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use create workout entry hook
  const { createNewEntry, canCreate } = useCreateWorkoutEntry({
    provider,
    historySelection,
    setHistoryEntries,
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

  // --- Event Bus Subscriptions ---

  // Handlers
  const handleEditorMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };

  // Handle block hover from timer display (for highlighting in editor/index)
  // Also used by Preview in History view
  const handleBlockHover = useCallback((blockKey: string | null) => {
    setHoveredBlockKey(blockKey);
  }, [setHoveredBlockKey]);

  // Handle block click from timer display (navigate to block in editor)
  const handleBlockClick = useCallback((blockKey: string) => {
    workbenchEventBus.emitScrollToBlock(blockKey, 'track');
  }, []);

  // --- Event Bus Subscriptions ---

  // Handle SCROLL_TO_BLOCK requests from Preview or Timeline
  useEffect(() => {
    // Only active if we have an editor instance
    if (!editorInstance) return;

    const cleanup = workbenchEventBus.onScrollToBlock(({ blockId }) => {
      if (!runtime) return;

      // Find the block in the runtime stack or raw blocks list
      // 1. Try finding by ID directly in raw blocks (from setBlocks)
      //    Note: Workbench has 'blocks' state from PlanPanel
      const targetBlock = blocks.find(b => b.id === blockId);

      if (targetBlock) {
        const line = targetBlock.startLine;
        editorInstance.revealLineInCenter(line);
        editorInstance.setPosition({ lineNumber: line, column: 1 });
        setHighlightedLine(line);
        setTimeout(() => setHighlightedLine(null), 2000);
      } else {
        // Fallback: Try runtime block matching
        const block = runtime.stack.blocks.find(b => b.key.toString() === blockId);
        if (block?.sourceIds && block.sourceIds.length > 0) {
          const statementId = block.sourceIds[0];
          for (const wodBlock of blocks) {
            const stmt = wodBlock.statements?.find(s => s.id === statementId);
            if (stmt && stmt.meta?.line) {
              const line = wodBlock.startLine + stmt.meta.line;
              editorInstance.revealLineInCenter(line);
              setHighlightedLine(line);
              setTimeout(() => setHighlightedLine(null), 2000);
              break;
            }
          }
        }
      }
    });

    return () => { cleanup(); };
  }, [editorInstance, blocks, runtime]);

  // Handle HIGHLIGHT_BLOCK from editor (to sync Preview)
  // Actually, PlanPanel emits this, and NotePreview listens directly via the bus.
  // Workbench doesn't strictly need to intermediate unless it wants to track state.

  // --- Layout Helpers ---


  // Plan view: Just the Monaco Editor (full width, no index panel)
  // WOD blocks get inline visualization through Monaco view zones
  const planPanel = (
    <PlanPanel
      initialContent={initialContent}
      value={content}
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

  // Track Index: SessionHistory
  // Hide context panel when debugger is open (it's shown there instead)
  const trackIndexPanel = (
    <SessionHistory
      runtime={runtime}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      hoveredBlockKey={hoveredBlockKey}
      execution={execution}
    />
  );

  // Track Primary: Timer Display
  const trackPrimaryPanel = (
    <TimerScreen
      runtime={runtime}
      execution={execution}
      selectedBlock={selectedBlock}
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
      onSelectSegment={toggleAnalyticsSegment}
      groups={analyticsGroups}
    />
  );

  // Review Primary: TimelineView
  const reviewPrimaryPanel = (
    <ReviewPanelPrimary
      rawData={analyticsData}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={toggleAnalyticsSegment}
      groups={analyticsGroups}
    />
  );

  // --- History View Components ---

  // 1. Filter Panel
  const historyFilterPanel = contentMode === 'history' && historySelection ? (
    <ListFilter
      calendarDate={historySelection.calendarDate}
      onCalendarDateChange={historySelection.setCalendarDate}
      entryDates={new Set(historyEntries.map(e => new Date(e.updatedAt).toISOString().split('T')[0]))}
      selectedIds={historySelection.selectedIds}
      onSelectAll={() => historySelection.selectAll(historyEntries.map(e => e.id))}
      onClearSelection={historySelection.clearSelection}
      onCreateNewEntry={createNewEntry}
      canCreate={canCreate}
    />
  ) : null;

  // 2. List Panel
  const historyListPanel = contentMode === 'history' && historySelection ? (
    <ListOfNotes
      entries={historyEntries}
      selectedIds={historySelection.selectedIds}
      onToggleEntry={historySelection.toggleEntry}
      onOpenEntry={(id) => navigate(`/note/${id}/history`)}
      activeEntryId={historySelection.activeEntryId}
      enriched={false}
    />
  ) : null;

  const historySelectedIds = historySelection?.selectedIds;
  const selectedEntries = useMemo(() => {
    if (!historySelectedIds) return [];
    return historyEntries.filter(e => historySelectedIds.has(e.id));
  }, [historyEntries, historySelectedIds]);

  // 3. Preview Panel (either Note Preview or Analytics)
  const showNotePreview = !!historySelection?.activeEntryId && stripMode !== 'multi-select';
  const showAnalyticsPreview = stripMode === 'multi-select';

  const historyPreviewPanel = useMemo(() => {
    if (showNotePreview) {
      // Note Preview
      return (
        <NotePreview
          items={documentItems}
          activeBlockId={_activeBlockId || undefined}
          onBlockClick={(item) => handleBlockClick(item.id)}
          onBlockHover={handleBlockHover}
          onStartWorkout={() => {
            const block = blocks.find(b => b.id === _activeBlockId);
            if (block) handleStartWorkoutAction(block);
          }}
          title="Workout Preview"
        />
      );
    }
    if (showAnalyticsPreview) {
      // Analytics Preview (AnalyzePanel)
      return <AnalyzePanel selectedEntries={selectedEntries} />;
    }
    return undefined;
  }, [showNotePreview, showAnalyticsPreview, documentItems, _activeBlockId, handleBlockClick, handleBlockHover, handleStartWorkoutAction, selectedEntries, blocks]);


  // Auto-navigate back to History root when all selections are cleared
  useEffect(() => {
    if (contentMode !== 'history') return;
    // If we are in history view, but no selection and URL has ID, maybe go back? 
    // Actually, createHistoryView handles specific panels.
    // If stripMode is 'history-only' (no selection), we might want to ensure we are at /history
    if (stripMode === 'history-only' && viewMode === 'history' && historySelection?.activeEntryId) {
      // Only if activeEntryId is set but stripMode thinks we are history-only? 
      // history-only means < 2 selected. 
      // If activeEntryId is set, stripMode is 'single-select'.
    }
  }, [stripMode, contentMode, viewMode]);

  // --- Build View Descriptors ---
  const viewDescriptors = useMemo(() => {
    if (contentMode === 'static') {
      return [
        createPlanView(planPanel),
        createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode),
        createReviewView(reviewIndexPanel, reviewPrimaryPanel),
      ];
    }

    // History mode: Always include History view with dynamic panels
    const views = [
      createHistoryView(
        historyFilterPanel,
        historyListPanel,
        historyPreviewPanel
      )
    ];

    // Add other views if we have a valid selection (active workout)
    // or if we are forced to show them (e.g. playground)
    if (stripMode === 'single-select' || viewMode !== 'history') {
      views.push(createPlanView(planPanel));
      views.push(createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode));
      views.push(createReviewView(reviewIndexPanel, reviewPrimaryPanel));
    }

    // If multi-select, we might want a dedicated Analyze view tab as well?
    // Plan says "Col 3 renders AnalyticsPreview".
    // But also "Col 2 spans Col 2+3".

    return views;
  }, [
    contentMode,
    stripMode,
    viewMode,
    planPanel,
    trackPrimaryPanel,
    trackIndexPanel,
    trackDebugPanel,
    isDebugMode,
    reviewIndexPanel,
    reviewPrimaryPanel,
    historyFilterPanel,
    historyListPanel,
    historyPreviewPanel
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
              <div className="relative mx-2 w-full max-w-[200px] hidden md:block">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm text-muted-foreground font-normal px-2 h-8"
                  onClick={() => {
                    // If a strategy is locked, ensure it's set (or let global default apply)
                    // For this use case, we probably want to ensure the navigation strategy is active if passed
                    if (editorProps.commandStrategy) {
                      setStrategy(editorProps.commandStrategy);
                    }
                    setIsOpen(true);

                  }}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search...
                  <span className="ml-auto text-xs opacity-50">⌘K</span>
                </Button>
              </div>
            )}

            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStrategy(null);
                  setIsOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Open command palette"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}


            {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

            {/* View Mode Buttons — dynamically built from current viewDescriptors */}
            {
              viewDescriptors.map(view => (
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
              ))
            }

            <div className="h-6 w-px bg-border mx-2" />

            <AudioToggle />
            <ThemeToggle />
            {
              !isMobile && (
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
              )
            }
          </div>
        </div>

        {/* Main Content - Responsive Viewport */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResponsiveViewport
            views={viewDescriptors}
            currentView={viewMode}
            onViewChange={setViewMode}
            panelLayouts={panelLayouts}
            onExpandPanel={expandPanel}
            onCollapsePanel={collapsePanel}
          />
        </div>
      </div >
      <CommandPalette />
    </>
  );
};

// --- Exported Component with Providers ---
export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const defaultTheme = useMemo(() => {
    if (props.theme === 'vs-dark' || props.theme === 'wod-dark') return 'dark';
    if (props.theme === 'vs' || props.theme === 'wod-light') return 'light';
    return 'system';
  }, [props.theme]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey="wod-wiki-theme">
      <CommandProvider>
        <WorkbenchProvider
          initialContent={props.initialContent}
          initialActiveEntryId={props.initialActiveEntryId}
          initialViewMode={props.initialViewMode}
          mode={props.mode}
          provider={props.provider}
        >
          <AudioProvider>
            <RuntimeLifecycleProvider factory={runtimeFactory}>
              <WorkbenchSyncBridge>
                <WorkbenchContent {...props} />
              </WorkbenchSyncBridge>
            </RuntimeLifecycleProvider>
          </AudioProvider>
        </WorkbenchProvider>
      </CommandProvider>
    </ThemeProvider>
  );
};

export default Workbench;
