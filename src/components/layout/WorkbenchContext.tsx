import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { WodBlock, WorkoutResults } from '../../markdown-editor/types';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import type { PanelLayoutState } from './panel-system/types';
import type { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import type { HistoryEntry, StripMode } from '../../types/history';
import { useHistorySelection } from '../../hooks/useHistorySelection';
import type { UseHistorySelectionReturn } from '../../hooks/useHistorySelection';
import { StaticContentProvider } from '../../services/content/StaticContentProvider';

/**
 * WorkbenchContext - Manages document state and view navigation
 *
 * DECOUPLED: Runtime management has been moved to RuntimeProvider.
 * This context now focuses solely on:
 * - Document state (content, blocks, active/selected block)
 * - View mode navigation
 * - Workout results collection
 * - Panel layout state (for responsive panel system)
 *
 * Components needing runtime should use useRuntime() from RuntimeProvider.
 */

interface WorkbenchContextState {
  // Document State
  content: string;
  blocks: WodBlock[];
  activeBlockId: string | null; // Cursor location

  // Execution State
  selectedBlockId: string | null; // Target for execution
  viewMode: ViewMode;

  // Results State
  results: WorkoutResults[];

  // Panel Layout State (per-view)
  panelLayouts: Record<string, PanelLayoutState>;

  // Content Provider
  provider: IContentProvider;

  // Content Provider Mode
  contentMode: ContentProviderMode;

  // Strip mode (derived from content mode + selection)
  stripMode: StripMode;

  // History selection (null when contentMode='static')
  historySelection: UseHistorySelectionReturn | null;

  // History entries (empty when contentMode='static')
  historyEntries: HistoryEntry[];
  setHistoryEntries: (entries: HistoryEntry[]) => void;

  // Actions
  setContent: (content: string) => void;
  setBlocks: (blocks: WodBlock[]) => void;
  setActiveBlockId: (id: string | null) => void;
  selectBlock: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  startWorkout: (block: WodBlock) => void;
  completeWorkout: (results: WorkoutResults) => void;

  // Panel Layout Actions
  expandPanel: (viewId: string, panelId: string) => void;
  collapsePanel: (viewId: string) => void;
}

const WorkbenchContext = createContext<WorkbenchContextState | undefined>(undefined);

export const useWorkbench = () => {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
};

interface WorkbenchProviderProps {
  children: React.ReactNode;
  initialContent?: string;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({
  children,
  initialContent = '',
  mode: _mode = 'static',
  provider: externalProvider,
}) => {
  // Resolve provider: use external if given, else auto-create from mode + initialContent
  const provider = externalProvider ?? new StaticContentProvider(initialContent);
  const resolvedMode = provider.mode;

  // Document State
  const [content, setContent] = useState(initialContent);
  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Execution State (runtime now managed by RuntimeProvider)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewModeRaw] = useState<ViewMode>(resolvedMode === 'history' ? 'history' : 'plan');

  // Results State
  const [results, setResults] = useState<WorkoutResults[]>([]);

  // Panel Layout State (per-view)
  const [panelLayouts, setPanelLayouts] = useState<Record<string, PanelLayoutState>>({});

  // History entries (managed externally, stored here for context sharing)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // History selection (only active when mode='history')
  const historySelectionHook = useHistorySelection();
  const historySelection = resolvedMode === 'history' ? historySelectionHook : null;

  // Derive strip mode from content mode + selection state
  const stripMode: StripMode = resolvedMode === 'static'
    ? 'static'
    : historySelectionHook.stripMode;

  // Guard viewMode setter: reject 'history' and 'analyze' in static mode
  const setViewMode = useCallback((newMode: ViewMode) => {
    if (resolvedMode === 'static' && (newMode === 'history' || newMode === 'analyze')) {
      return; // Safety guard — these views don't exist in static mode
    }
    setViewModeRaw(newMode);
  }, [resolvedMode]);

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const startWorkout = useCallback((block: WodBlock) => {
    setSelectedBlockId(block.id);
    setViewMode('track');
  }, []);

  const completeWorkout = useCallback((result: WorkoutResults) => {
    setResults(prev => [...prev, result]);
    setViewMode('review');

    // Auto-save if provider supports writing
    if (provider.capabilities.canWrite) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';
      provider.saveEntry({
        title,
        rawContent: content,
        tags: [],
        results: {
          completedAt: result.endTime,
          duration: result.duration,
          logs: [],
        },
      }).catch(err => console.error('Failed to auto-save workout:', err));
    }
  }, [provider, content, setViewMode]);

  // Panel Layout Actions
  const expandPanel = useCallback((viewId: string, panelId: string) => {
    setPanelLayouts(prev => {
      const viewLayout = prev[viewId] || {
        viewId,
        panelSpans: {},
        expandedPanelId: null,
      };

      // Store previous spans if not already expanded
      const previousSpans = viewLayout.expandedPanelId ? viewLayout.panelSpans : { ...viewLayout.panelSpans };

      return {
        ...prev,
        [viewId]: {
          ...viewLayout,
          panelSpans: {
            ...previousSpans,
            [panelId]: 3, // Set to full-screen
          },
          expandedPanelId: panelId,
        },
      };
    });
  }, []);

  const collapsePanel = useCallback((viewId: string) => {
    setPanelLayouts(prev => {
      const viewLayout = prev[viewId];
      if (!viewLayout) return prev;

      return {
        ...prev,
        [viewId]: {
          ...viewLayout,
          expandedPanelId: null,
          // Spans remain as they were before expansion
        },
      };
    });
  }, []);

  const value = useMemo(() => ({
    content,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    panelLayouts,
    provider,
    contentMode: resolvedMode,
    stripMode,
    historySelection,
    historyEntries,
    setHistoryEntries,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    expandPanel,
    collapsePanel,
  }), [
    content,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    panelLayouts,
    provider,
    resolvedMode,
    stripMode,
    historySelection,
    historyEntries,
    setHistoryEntries,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    expandPanel,
    collapsePanel,
  ]);

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
};
