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
import { MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { CommandProvider, useCommandPalette } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Github, Search, Lock } from 'lucide-react';
import { NotebookMenu } from '../notebook/NotebookMenu';
import { toNotebookTag } from '../../types/notebook';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { AudioProvider } from '../audio/AudioContext';
import { AudioToggle } from '../audio/AudioToggle';
import { DebugButton, RuntimeDebugPanel } from '../workout/RuntimeDebugPanel';
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
import { SessionHistory, TimerScreen } from '../workbench/TrackPanel';
import { ReviewPanelIndex, ReviewPanelPrimary } from '../workbench/ReviewPanel';
import { NoteActions } from '../notebook/NoteActions';

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
  const { id: routeId } = useParams<{ id: string }>();
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
      setCurrentEntryTags([]);
      return;
    }

    const loadEntry = async () => {
      // 1. Try fetching from provider (if history mode)
      if (provider.mode === 'history') {
        try {
          const entry = await provider.getEntry(routeId);
          if (entry) {
            setCurrentEntry(entry);
            setCurrentEntryTags(entry.tags);
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
        setCurrentEntryTags([]);
        return;
      }

      // 3. Nothing found
      setCurrentEntry(null);
      setCurrentEntryTags([]);
    };

    loadEntry();
  }, [routeId, provider]);

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

  // Local UI state
  // editorInstance kept for useBlockEditor and scroll-to-block compatibility
  // (will be null since PlanPanel no longer provides a Monaco instance)
  const [editorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
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
    <PlanPanel
      initialContent={initialContent}
      value={content}
      sections={sections}
      onStartWorkout={handleStartWorkoutAction}
      setActiveBlockId={setActiveBlockId}
      setBlocks={setBlocks}
      setContent={setContent}
      saveState={saveState}
    />
  );

  const trackIndexPanel = (
    <SessionHistory
      runtime={runtime}
      activeSegmentIds={activeSegmentIds}
      activeStatementIds={activeStatementIds}
      hoveredBlockKey={hoveredBlockKey}
      execution={execution}
    />
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
    />
  );

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

  const reviewIndexPanel = (
    <ReviewPanelIndex
      runtime={runtime}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={toggleAnalyticsSegment}
      groups={analyticsGroups}
    />
  );

  const reviewPrimaryPanel = (
    <ReviewPanelPrimary
      rawData={analyticsData}
      segments={analyticsSegments}
      selectedSegmentIds={selectedAnalyticsIds}
      onSelectSegment={toggleAnalyticsSegment}
      groups={analyticsGroups}
    />
  );

  const viewDescriptors = useMemo(() => {
    const all = [
      createPlanView(planPanel),
      createTrackView(trackPrimaryPanel, trackIndexPanel, trackDebugPanel, isDebugMode),
      createReviewView(reviewIndexPanel, reviewPrimaryPanel),
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
    trackIndexPanel,
    trackDebugPanel,
    isDebugMode,
    reviewIndexPanel,
    reviewPrimaryPanel,
    currentEntry?.type
  ]);

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
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
            {!isMobile && (
              <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">
                {viewMode}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
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

            {viewDescriptors.map(view => (
              <Button
                key={view.id}
                variant={viewMode === view.id ? 'default' : 'ghost'}
                size={isMobile ? 'icon' : 'sm'}
                onClick={() => setViewMode(view.id as ViewMode)}
                className={cn('gap-2', viewMode !== view.id && 'text-muted-foreground hover:text-foreground')}
              >
                {view.icon}
                {!isMobile && view.label}
              </Button>
            ))}

            <div className="h-6 w-px bg-border mx-2" />

            <NoteActions
              entry={currentEntry}
              showLabel={currentEntry?.type === 'template'}
              variant={currentEntry?.type === 'template' ? 'primary' : 'default'}
              onClone={async () => {
                if (routeId && provider.mode === 'history') {
                  const cloned = await provider.cloneEntry(routeId);
                  navigate(`/note/${cloned.id}/plan`);
                }
              }}
            />

            <AudioToggle />
            <ThemeToggle />

            {!isMobile && (
              <a
                href="https://github.com/SergeiGolos/wod-wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            )}

            <NotebookMenu
              entryTags={routeId && provider.mode === 'history' ? currentEntryTags : undefined}
              onEntryToggle={routeId && provider.mode === 'history' ? handleNotebookToggleForCurrent : undefined}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ResponsiveViewport
            views={viewDescriptors}
            currentView={viewMode}
            onViewChange={setViewMode}
            panelLayouts={panelLayouts}
          />
        </div>
      </div >
      <CommandPalette />
    </>
  );
};

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
