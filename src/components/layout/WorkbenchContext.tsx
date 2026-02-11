import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { WodBlock, WorkoutResults } from '../../markdown-editor/types';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import type { PanelLayoutState } from './panel-system/types';
import type { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import type { HistoryEntry, StripMode } from '../../types/history';
import { useHistorySelection } from '../../hooks/useHistorySelection';
import type { UseHistorySelectionReturn } from '../../hooks/useHistorySelection';
import { StaticContentProvider } from '../../services/content/StaticContentProvider';
import { getWodContent } from '../../app/wod-loader';

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
  initialActiveEntryId?: string;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({
  children,
  initialContent: propInitialContent = '',
  initialActiveEntryId,
  mode: _mode = 'static',
  provider: externalProvider,
}) => {
  // Guard viewMode setter: navigate to the new route
  const navigate = useNavigate();
  const { id: routeId, view: routeView } = useParams<{ id: string, view: string }>();
  const { pathname } = useLocation();

  // Resolve provider: use external if given, else auto-create from mode + initialContent
  const provider = useMemo(() => externalProvider ?? new StaticContentProvider(propInitialContent), [externalProvider, propInitialContent]);
  const resolvedMode = provider.mode;

  // Document State
  const [content, setContent] = useState(propInitialContent);

  // History selection (only active when mode='history')
  const historySelectionHook = useHistorySelection();

  // Sync content when ID changes or propInitialContent changes
  useEffect(() => {
    const loadContent = async () => {
      if (routeId) {
        if (provider.mode === 'history') {
          try {
            const entry = await provider.getEntry(routeId);
            if (entry) {
              setContent(entry.rawContent);
              // Ensure visual selection matches the resolved entry.
              // Supports friendly name routes like /note/annie/plan.
              historySelectionHook.openEntry(entry.id);
              return;
            } else {
              // Try loading from static WOD files (fallback)
              const wodContent = getWodContent(routeId);
              if (wodContent) {
                setContent(wodContent);
                return;
              }
            }
          } catch (err) {
            console.error('[WorkbenchProvider] Failed to load content for ID:', routeId, err);
          }
        } else if (provider.mode === 'static' && routeId) {
          // Static mode with ID (e.g. playground/annie)
          const wodContent = getWodContent(routeId);
          if (wodContent) {
            setContent(wodContent);
            return;
          }
        }
      } else if (initialActiveEntryId && !historySelectionHook.activeEntryId) {
        historySelectionHook.openEntry(initialActiveEntryId);
      }

      // Default fallback
      setContent(propInitialContent);
    };

    loadContent();
  }, [routeId, propInitialContent, provider, historySelectionHook.openEntry, initialActiveEntryId]);

  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Execution State (runtime now managed by RuntimeProvider)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Derive viewMode from route
  const viewMode = useMemo(() => {
    if (pathname === '/' || pathname.startsWith('/history')) return 'history';

    // Valid view from URL
    if (routeView === 'plan' || routeView === 'track' || routeView === 'review' || routeView === 'analyze') {
      return routeView as ViewMode;
    }

    // Default to 'plan' if we have an ID or are in playground
    if (routeId || pathname.startsWith('/playground')) return 'plan';

    return resolvedMode === 'history' ? 'history' : 'plan';
  }, [pathname, routeView, routeId, resolvedMode]);

  // Results State
  const [results, setResults] = useState<WorkoutResults[]>([]);

  // Panel Layout State (per-view)
  const [panelLayouts, setPanelLayouts] = useState<Record<string, PanelLayoutState>>({});

  // History entries (managed externally, stored here for context sharing)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // (Selection sync now handled within loadContent effect above)

  const historySelection = resolvedMode === 'history' ? historySelectionHook : null;

  // Derive strip mode from content mode + selection state
  const stripMode: StripMode = useMemo(() => {
    if (resolvedMode === 'static') return 'static';

    // Multi-select mode (when 2+ are checked)
    if (historySelectionHook.selectedIds.size >= 2) return 'multi-select';

    // Single-select mode (when an entry is open via URL or state)
    if (routeId || historySelectionHook.activeEntryId) return 'single-select';

    // Default browse mode
    return 'history-only';
  }, [resolvedMode, historySelectionHook.selectedIds.size, historySelectionHook.activeEntryId, routeId]);

  // Guard viewMode setter: navigate to the new route
  const setViewMode = useCallback((newMode: ViewMode) => {
    if (resolvedMode === 'static' && (newMode === 'history' || newMode === 'analyze')) {
      return; // Safety guard — these views don't exist in static mode
    }

    if (newMode === 'history') {
      navigate('/history');
    } else if (routeId) {
      navigate(`/note/${routeId}/${newMode}`);
    } else if (pathname.startsWith('/playground')) {
      navigate(`/playground/${newMode}`);
    } else {
      // Fallback if no ID but trying to go to a workout view? 
      // This happens for seeded playground etc.
      console.warn('[WorkbenchContext] Navigation attempted to workout view without ID or playground context');
    }
  }, [resolvedMode, navigate, routeId, pathname]);

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const startWorkout = useCallback((block: WodBlock) => {
    setSelectedBlockId(block.id);
    // Explicitly transition to 'track' view via URL
    setViewMode('track');
  }, [setViewMode]);

  const completeWorkout = useCallback((result: WorkoutResults) => {
    setResults(prev => [...prev, result]);
    setViewMode('review');

    // Auto-save if provider supports writing
    if (provider.capabilities.canWrite) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';

      const payload = {
        title,
        rawContent: content,
        results: {
          completedAt: result.endTime,
          duration: result.duration,
          logs: [],
        },
      };

      if (routeId) {
        provider.updateEntry(routeId, payload)
          .catch(err => console.error('Failed to auto-update workout:', err));
      } else {
        provider.saveEntry({
          ...payload,
          tags: [],
          notes: '',
        }).catch(err => console.error('Failed to auto-save workout:', err));
      }
    }
  }, [provider, content, setViewMode, routeId]);

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
