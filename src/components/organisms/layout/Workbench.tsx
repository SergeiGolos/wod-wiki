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
import type { NoteEditorProps } from '@/components/organisms/editor/NoteEditor';
import { CommandProvider } from '@/components/organisms/command-palette/CommandContext';
import { PaletteShell } from '@/components/organisms/command-palette/PaletteShell';
import { Upload } from 'lucide-react';
import { useTutorialStore } from '@/hooks/useTutorialStore';
import { toNotebookTag } from '@/types/notebook';
import { NoteDetailsPanel } from '@/components/organisms/workbench/NoteDetailsPanel';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ResponsiveViewport } from '@/panels/panel-system/ResponsiveViewport';
import { createPlanView, createTrackView, createReviewView } from '@/panels/panel-system/viewDescriptors';
import type { ViewMode } from '@/panels/panel-system/ResponsiveViewport';
import { WorkbenchProvider, useWorkbench } from './WorkbenchContext';
import { RuntimeLifecycleProvider } from './RuntimeLifecycleProvider';
import { useWorkbenchEffects } from './useWorkbenchEffects';
import { useWorkbenchSync } from './useWorkbenchSync';
import { useDebugMode } from '@/components/layout/DebugModeContext';
import { runtimeFactory } from '@/hooks/useRuntimeFactory';
import type { ContentProviderMode, IContentProvider } from '@/types/content-provider';
import type { HistoryEntry, WorkoutResults } from '@/types/history';
import { workbenchEventBus } from '@/hooks/useBrowserServices';
import { getWorkbenchDocumentTitle, loadWorkbenchDisplayEntry } from '@/app/workbench/workbenchEntryLoader';
import { WorkbenchCastBridge } from '@/components/organisms/cast/WorkbenchCastBridge';
import { useScreenMode } from '@/panels/panel-system/useScreenMode';
import { MetricType } from '@/core/models/Metric';
import type { ProjectionResult } from '@/core/analytics/ProjectionResult';
import { WorkbenchHeader } from '@/components/organisms/workbench/WorkbenchHeader';
import { WorkbenchTemplate } from '@/templates';
import type { Attachment } from '@/types/storage';

declare const __APP_VERSION__: string | undefined;
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.dev';

import { PlanPanel } from '@/panels/plan-panel';
import { TimerScreen } from '@/panels/track-panel';
import { ResultsView } from '@/components/organisms/review';
import type { Segment } from '@/core/models/AnalyticsModels';

export interface WorkbenchProps extends Omit<NoteEditorProps, 'onBlocksChange' | 'onActiveBlockChange' | 'onCursorPositionChange' | 'highlightedLine' | 'value' | 'onChange' | 'mode'> {
  initialContent?: string;
  initialActiveEntryId?: string;
  initialViewMode?: ViewMode;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
  /** Called when the search button / Ctrl+/ is triggered. Caller opens the palette with context-appropriate sources. */
  onSearch?: () => void;
  hidePlanUnlessDebug?: boolean;
}

// --- Main Workbench Content ---
const WorkbenchContent: React.FC<WorkbenchProps> = ({
  initialContent,
  theme: propTheme,
  hidePlanUnlessDebug = false,
  ...editorProps
}) => {
  useWorkbenchEffects();
  const navigate = useNavigate();
  const { noteId: routeId } = useParams<{ noteId: string }>();
  const { theme, setTheme } = useTheme();
  const { isDebugMode } = useDebugMode();

  // Consume Workbench Context (document state, view mode, panel layouts)
  const {
    content,
    viewMode,
    panelLayouts,
    activeBlockId: _activeBlockId,
    setBlocks,
    setActiveBlockId,
    selectBlock: _selectBlock,
    setContent,
    setViewMode,
    saveState,
    completeWorkout,
    currentEntry: contextEntry,
    addAttachment,
    attachments,
    deleteAttachment,
  } = useWorkbench();

  const handleDownload = useCallback((att: Attachment) => {
    const blob = att.data instanceof ArrayBuffer
      ? new Blob([att.data], { type: att.mimeType })
      : new Blob([att.data], { type: att.mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.label;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const { provider } = useWorkbench();

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = React.useRef(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await addAttachment(file);
      }
      // Reset input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  }, [addAttachment]);

  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
          await addAttachment(file);
        }
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [addAttachment]);

  // Current entry state
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | null>(null);

  // Current entry tags (for Add to Notebook button)
  const [currentEntryTags, setCurrentEntryTags] = useState<string[]>([]);
  useEffect(() => {
    if (!routeId) {
      setCurrentEntry(null);
      return;
    }

    const loadEntry = async () => {
      const entry = await loadWorkbenchDisplayEntry(routeId, provider);
      if (entry) {
        setCurrentEntry(entry);
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
    document.title = getWorkbenchDocumentTitle(currentEntry, routeId);
  }, [currentEntry, routeId]);

  // Consume synced state from Zustand store (via useWorkbenchEffects)
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

  const { goToPlan } = useWorkbench();

  // Handle NAVIGATE_TO requests from syntax links
  useEffect(() => {
    const cleanup = workbenchEventBus.onNavigateTo(({ entryId, view: _view }) => {
      // In Storybook/Static mode, we just update the in-memory noteId
      // and let the provider/context handle loading the content.
      goToPlan(entryId);
    });
    return () => { cleanup(); };
  }, [goToPlan]);

  const { startTutorial } = useTutorialStore();

  // Responsive screen mode
  const screenMode = useScreenMode();
  const isMobile = screenMode === 'mobile';

  // Sync theme from props
  useEffect(() => {
    if (!propTheme) return;
    const targetTheme = (propTheme === 'vs-dark' || propTheme === 'wod-dark') ? 'dark' : 'light';
    if (theme !== 'system' && theme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [propTheme, theme, setTheme]);

  // Handle plan panel visibility constraints
  useEffect(() => {
    const showPlan = !hidePlanUnlessDebug || isDebugMode;
    if (!showPlan && viewMode === 'plan') {
      setViewMode('track');
    }
  }, [hidePlanUnlessDebug, isDebugMode, viewMode, setViewMode]);

  const handleBlockHover = useCallback((blockKey: string | null) => {
    setHoveredBlockKey(blockKey);
  }, [setHoveredBlockKey]);

  const handleBlockClick = useCallback((blockKey: string) => {
    workbenchEventBus.emitScrollToBlock(blockKey, 'track');
  }, []);

  // Handle SCROLL_TO_BLOCK requests
  useEffect(() => {
    const cleanup = workbenchEventBus.onScrollToBlock(({ blockId }) => {
      // Find line from documentItems
      const item = documentItems.find(i => i.id === blockId);
      if (item) {
        const line = item.startLine;
        // Scroll logic will be handled by PlanPanel or via event bus in the future
        setHighlightedLine(line);
        setTimeout(() => setHighlightedLine(null), 2000);
      }
    });

    return () => { cleanup(); };
  }, [documentItems, setHighlightedLine]);

  const handleCompleteWorkout = useCallback((blockId: string, results: WorkoutResults) => {
    // Sync selection so completeWorkout knows which section these results belong to
    _selectBlock(blockId);
    // Persist result via provider (WorkbenchContext handles navigation/save)
    completeWorkout(results);
  }, [_selectBlock, completeWorkout]);

  // --- View Components ---

  const planPanel = (
    <div id="tutorial-editor" className="h-full">
      <PlanPanel
        sourceNoteId={contextEntry?.id}
        initialContent={initialContent}
        value={content}
        onStartWorkout={handleStartWorkoutAction}
        onCompleteWorkout={handleCompleteWorkout}
        setBlocks={setBlocks}
        setContent={setContent}
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
      <ResultsView
        runtime={runtime}
        segments={analyticsSegments}
        selectedSegmentIds={selectedAnalyticsIds}
        onSelectSegment={toggleAnalyticsSegment}
        groups={analyticsGroups}
        projections={extractProjections(analyticsSegments)}
        hoveredBlockKey={hoveredBlockKey}
        onHoverBlockKey={setHoveredBlockKey}
      />
    </div>
  );

  const viewDescriptors = useMemo(() => {
    const showPlan = !hidePlanUnlessDebug || isDebugMode;

    const all = [
      showPlan && createPlanView(planPanel),
      createTrackView(trackPrimaryPanel, null),
      createReviewView(reviewGridPanel),
    ].filter(Boolean) as any[];

    // Branch: If we are viewing a template, only show Plan (View)
    if (currentEntry?.type === 'template') {
      const planView = createPlanView(planPanel);
      return [{
        ...planView,
        title: 'View',
        icon: <span className="h-4 w-4 flex items-center justify-center text-xs">🔒</span>,
      }];
    }

    return all;
  }, [
    planPanel,
    trackPrimaryPanel,
    reviewGridPanel,
    currentEntry?.type,
    hidePlanUnlessDebug,
    isDebugMode,
  ]);

  return (
    <React.Fragment>
      <WorkbenchTemplate
        dragOverlay={
          isDragging ? (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xl font-medium">Drop files to attach to this note</p>
                <p className="text-sm text-muted-foreground">GPX and other files supported</p>
              </div>
            </div>
          ) : undefined
        }
        header={
          <WorkbenchHeader
            appVersion={appVersion}
            isMobile={isMobile}
            currentEntry={currentEntry}
            saveState={saveState}
            onSearch={editorProps.onSearch}
            viewMode={viewMode}
            views={viewDescriptors.map(v => ({ id: v.id, label: v.label ?? v.title ?? v.id, icon: v.icon }))}
            onViewChange={(id) => setViewMode(id as ViewMode)}
            attachments={attachments}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDownloadAttachment={handleDownload}
            onDeleteAttachment={deleteAttachment}
            currentEntryTags={currentEntryTags}
            onNotebookToggle={handleNotebookToggleForCurrent}
            isDetailsOpen={isDetailsOpen}
            onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
            onStartTutorial={(vm) => startTutorial(vm as any)}
          />
        }
        sidePanel={
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
        }
      >
        <ResponsiveViewport
          views={viewDescriptors}
          currentView={viewMode}
          onViewChange={setViewMode}
          panelLayouts={panelLayouts}
        />
      </WorkbenchTemplate>
      <PaletteShell />
    </React.Fragment>
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
          <WorkbenchCastBridge />
          <WorkbenchContent {...props} />
        </RuntimeLifecycleProvider>
      </WorkbenchProvider>
    </CommandProvider>
  );
};

export default Workbench;

// ─── Helper: Extract projections from analytics segments ───────

function extractProjections(segments: Segment[]): ProjectionResult[] {
  return segments
    .filter(s => (s as any).context?.outputType === 'analytics')
    .map(s => {
      const metrics = s.metrics?.toArray() || [];
      const labelMetric = metrics.find(m => m.type === MetricType.Label);
      const valueMetric = metrics.find(m => m.type !== MetricType.Label);

      return {
        name: labelMetric?.value?.toString() || labelMetric?.image || 'Stat',
        value: (valueMetric?.value as number) || 0,
        unit: valueMetric?.unit || '',
        metricType: valueMetric?.type,
        origin: valueMetric?.origin || 'analyzed',
        timeSpan: { started: s.startTime, ended: s.endTime }
      } as ProjectionResult;
    });
}