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
import { useNavigate, useParams } from 'react-router-dom';
import { planPath } from '@/lib/routes';
import { MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { CommandProvider, useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Search, Lock, Loader2, Check, AlertCircle, PanelRightOpen, HelpCircle } from 'lucide-react';
import { useTutorialStore } from '@/hooks/useTutorialStore';
import { NotebookMenu } from '../notebook/NotebookMenu';
import { toNotebookTag } from '../../types/notebook';
import { Button } from '@/components/ui/button';
import { NoteDetailsPanel } from '../workbench/NoteDetailsPanel';
import { useTheme } from '../theme/ThemeProvider';
import { CommitGraph } from '../ui/CommitGraph';
import { ResponsiveViewport } from './panel-system/ResponsiveViewport';
import { createPlanView, createTrackView, createReviewView } from './panel-system/viewDescriptors';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import { cn } from '../../lib/utils';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeLifecycleProvider } from './RuntimeLifecycleProvider';
import { WorkbenchSyncBridge } from './WorkbenchSyncBridge';
import { useWorkbenchSync } from './useWorkbenchSync';
import { RuntimeFactory } from '../../runtime/compiler/RuntimeFactory';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';
import { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import { HistoryEntry } from '../../types/history';
import { workbenchEventBus } from '../../services/WorkbenchEventBus';
import { getWodContent } from '../../app/wod-loader';

import { PlanPanel } from '../workbench/PlanPanel';
import { TimerScreen } from '../workbench/TrackPanel';
import { ReviewGrid } from '../review-grid';

// Create singleton factory instance
const runtimeFactory = new RuntimeFactory(globalCompiler);

export interface WorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine'> {
  initialContent?: string;
  initialActiveEntryId?: string;
  initialViewMode?: ViewMode;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
  commandStrategy?: any; // CommandStrategy
}

// --- Main Workbench Content ---
const WorkbenchContent: React.FC<WorkbenchProps> = ({
  initialContent,
  theme: propTheme,
  ...editorProps
}) => {
  const navigate = useNavigate();
  const { noteId: routeId } = useParams<{ noteId: string }>();
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
    sections,
    viewMode,
    panelLayouts,
    activeBlockId: _activeBlockId,
    setBlocks,
    setActiveBlockId,
    selectBlock: _selectBlock,
    setContent,
    setViewMode,
    saveState,
    currentEntry: contextEntry,
  } = useWorkbench();

  const { provider } = useWorkbench();

  // Current entry state
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | null>(null);

  // Current entry tags (for Add to Notebook button)
  const [currentEntryTags, setCurrentEntryTags] = useState<string[]>([]);
  useEffect(() => {
    // Helper to synthesize template entry from static content
    const createTemplateEntry = (id: string, content: string): HistoryEntry => {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : id;
      return {
        id,
        title,
        rawContent: content,
        type: 'template',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        targetDate: Date.now(),
        schemaVersion: 1
      };
    };

    if (!routeId) {
      setCurrentEntry(null);
      // setCurrentEntryTags([]);
      return;
    }

    const loadEntry = async () => {
      // 1. Try fetching from provider (if history mode)
      if (provider.mode === 'history') {
        try {
          const entry = await provider.getEntry(routeId);
          if (entry) {
            setCurrentEntry(entry);
            // setCurrentEntryTags(entry.tags);
            return;
          }
        } catch (e) {
          console.warn('Failed to load entry from provider', e);
        }
      }

      // 2. Fallback: Try static WOD content (for static mode OR history mode fallback)
      const wodContent = getWodContent(routeId);
      if (wodContent) {
        const templateEntry = createTemplateEntry(routeId, wodContent);
        setCurrentEntry(templateEntry);
        // setCurrentEntryTags([]);
        return;
      }

      // 3. Nothing found
      setCurrentEntry(null);
      setCurrentEntryTags([]);
    };

    loadEntry();
  }, [routeId, provider]);

  // Sync tags if entry changes externally
  useEffect(() => {
    if (currentEntry) {
      setCurrentEntryTags(currentEntry.tags);
    }
  }, [currentEntry]);

  // Details panel state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleNotebookToggleForCurrent = useCallback(async (notebookId: string, isAdding: boolean) => {
    if (!routeId || provider.mode !== 'history') return;
    const tag = toNotebookTag(notebookId);
    const newTags = isAdding
      ? [...currentEntryTags, tag]
      : currentEntryTags.filter(t => t !== tag);
    await provider.updateEntry(routeId, { tags: newTags });
    setCurrentEntryTags(newTags);
    if (currentEntry) {
      setCurrentEntry({ ...currentEntry, tags: newTags });
    }
  }, [routeId, provider, currentEntryTags, currentEntry]);

  // Update document title based on current entry or route
  useEffect(() => {
    if (currentEntry?.title) {
      document.title = `Wod.Wiki - ${currentEntry.title}`;
    } else if (routeId) {
      document.title = `Wod.Wiki - ${routeId}`;
    } else {
      document.title = 'Wod.Wiki';
    }
  }, [currentEntry?.title, routeId]);

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
    highlightedLine: _highlightedLine,
    setHighlightedLine,
    setCursorLine: _setCursorLine,
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

  const { startTutorial } = useTutorialStore();

  // Local UI state
  // editorInstance kept for useBlockEditor and scroll-to-block compatibility
  // (will be null since PlanPanel no longer provides a Monaco instance)
  const [editorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync theme from props
  useEffect(() => {
    if (!propTheme) return;
    const targetTheme = (propTheme === 'vs-dark' || propTheme === 'wod-dark') ? 'dark' : 'light';
    if (theme !== 'system' && theme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [propTheme, theme, setTheme]);

  // Block editor hooks
  const { editStatement: _editStatement, deleteStatement: _deleteStatement } = useBlockEditor({
    editor: editorInstance,
    block: selectedBlock
  });

  const handleBlockHover = useCallback((blockKey: string | null) => {
    setHoveredBlockKey(blockKey);
  }, [setHoveredBlockKey]);

  const handleBlockClick = useCallback((blockKey: string) => {
    workbenchEventBus.emitScrollToBlock(blockKey, 'track');
  }, []);

  // Handle SCROLL_TO_BLOCK requests
  useEffect(() => {
    if (!editorInstance) return;

    const cleanup = workbenchEventBus.onScrollToBlock(({ blockId }) => {
      // Find line from documentItems
      const item = documentItems.find(i => i.id === blockId);
      if (item) {
        const line = item.startLine;
        editorInstance.revealLineInCenter(line);
        editorInstance.setPosition({ lineNumber: line, column: 1 });
        setHighlightedLine(line);
        setTimeout(() => setHighlightedLine(null), 2000);
      }
    });

    return () => { cleanup(); };
  }, [editorInstance, documentItems, setHighlightedLine]);

  // --- View Components ---

  const planPanel = (
    <div id="tutorial-editor" className="h-full">
      <PlanPanel
        initialContent={initialContent}
        value={content}
        sections={sections}
        onStartWorkout={handleStartWorkoutAction}
        setActiveBlockId={setActiveBlockId}
        setBlocks={setBlocks}
        setContent={setContent}
        provider={provider}
        sourceNoteId={contextEntry?.id ?? routeId}
      />
    </div>
  );



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
      content={content}
      onStartWorkout={handleStartWorkoutAction}
      setBlocks={setBlocks}
    />
  );

  const reviewGridPanel = (
    <div id="tutorial-review-grid" className="h-full">
      <ReviewGrid
        runtime={runtime}
        segments={analyticsSegments}
        selectedSegmentIds={selectedAnalyticsIds}
        onSelectSegment={toggleAnalyticsSegment}
        groups={analyticsGroups}
        rawData={analyticsData}
        hoveredBlockKey={hoveredBlockKey}
        onHoverBlockKey={setHoveredBlockKey}
      />
    </div>
  );

  const viewDescriptors = useMemo(() => {
    const all = [
      createPlanView(planPanel),
      createTrackView(trackPrimaryPanel, null),
      createReviewView(reviewGridPanel),
    ];

    // Branch: If we are viewing a template, only show Plan (View)
    if (currentEntry?.type === 'template') {
      const planView = createPlanView(planPanel);
      return [{
        ...planView,
        title: 'View',
        icon: <Lock className="h-4 w-4" />,
      }];
    }

    return all;
  }, [
    planPanel,
    trackPrimaryPanel,
    reviewGridPanel,
    currentEntry?.type
  ]);

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <div id="tutorial-header" className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
          <div className="font-bold flex items-center gap-4">
            <div
              className={cn(
                'h-10 flex items-center cursor-pointer hover:opacity-80 transition-opacity',
                isMobile ? 'w-[150px]' : 'w-[300px]'
              )}
              onClick={() => navigate('/')}
            >
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
            {!isMobile && currentEntry && (
              <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {new Date(currentEntry.targetDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {!isMobile && saveState !== 'idle' && (
              <div className="flex items-center transition-opacity duration-300">
                {saveState === 'changed' && (
                  <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Changed</span>
                  </div>
                )}
                {saveState === 'saving' && (
                  <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {saveState === 'saved' && (
                  <div className="bg-background/80 backdrop-blur-sm border border-input rounded-full px-3 py-1 flex items-center gap-2 text-xs text-emerald-500 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <Check className="h-3 w-3" />
                    <span>Saved</span>
                  </div>
                )}
                {saveState === 'error' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1 flex items-center gap-2 text-xs text-destructive shadow-sm">
                    <AlertCircle className="h-3 w-3" />
                    <span>Save Failed</span>
                  </div>
                )}
              </div>
            )}
            {!isMobile && (
              <div className="relative mx-2 w-full max-w-[200px] hidden md:block">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm text-muted-foreground font-normal px-2 h-8"
                  onClick={() => {
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
              >
                <Search className="h-4 w-4" />
              </Button>
            )}

            {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => startTutorial(viewMode as any)}
              className="text-muted-foreground hover:text-foreground"
              title="Show Help"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>

            {!isMobile && <div className="h-6 w-px bg-border mx-2" />}

            {viewDescriptors.map(view => (
              <Button
                key={view.id}
                id={`tutorial-view-mode-${view.id}`}
                variant={viewMode === view.id ? 'default' : 'ghost'}
                size={isMobile ? 'icon' : 'sm'}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={cn('gap-2', viewMode !== view.id && 'text-muted-foreground hover:text-foreground')}
              >
                {view.icon}
                {!isMobile && view.label}
              </Button>
            ))}

            <NotebookMenu
              entryTags={currentEntryTags}
              onEntryToggle={handleNotebookToggleForCurrent}
              iconOnly={true}
            />

            <div className="h-6 w-px bg-border mx-2" />

            <button
              id="tutorial-details"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className={cn(
                "p-2 rounded-md transition-colors",
                isDetailsOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Toggle Note Details"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ResponsiveViewport
            views={viewDescriptors}
            currentView={viewMode}
            onViewChange={setViewMode}
            panelLayouts={panelLayouts}
          />
          <NoteDetailsPanel
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            entry={currentEntry}
            provider={provider}
            onEntryUpdate={(updated) => setCurrentEntry(updated)}
            onClone={async (targetDate?: number) => {
              if (routeId && provider.mode === 'history') {
                const cloned = await provider.cloneEntry(routeId, targetDate);
                navigate(planPath(cloned.id));
              }
            }}
          />
        </div>
      </div >
      <CommandPalette />
    </>
  );
};

export const Workbench: React.FC<WorkbenchProps> = (props) => {

  return (
    <CommandProvider>
      <WorkbenchProvider
        initialContent={props.initialContent}
        initialActiveEntryId={props.initialActiveEntryId}
        initialViewMode={props.initialViewMode}
        mode={props.mode}
        provider={props.provider}
      >
        <RuntimeLifecycleProvider factory={runtimeFactory}>
          <WorkbenchSyncBridge>
            <WorkbenchContent {...props} />
          </WorkbenchSyncBridge>
        </RuntimeLifecycleProvider>
      </WorkbenchProvider>
    </CommandProvider>
  );
};

export default Workbench;
