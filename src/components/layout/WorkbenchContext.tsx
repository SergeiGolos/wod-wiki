import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { WodBlock, WorkoutResults, Section } from '../../markdown-editor/types';
import type { ViewMode } from './panel-system/ResponsiveViewport';
import type { PanelLayoutState } from './panel-system/types';
import type { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import type { HistoryEntry, StripMode } from '../../types/history';
import { useHistorySelection } from '../../hooks/useHistorySelection';
import type { UseHistorySelectionReturn } from '../../hooks/useHistorySelection';
import { StaticContentProvider } from '../../services/content/StaticContentProvider';
import { getWodContent } from '../../app/wod-loader';
import { toNotebookTag } from '../../types/notebook';
import { useDebounce } from '../../hooks/useDebounce';
import { useRef } from 'react';

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

export type SaveState = 'idle' | 'changed' | 'saving' | 'saved' | 'error';

interface WorkbenchContextState {
  // Document State
  content: string;
  sections: Section[] | null;
  blocks: WodBlock[];
  activeBlockId: string | null; // Cursor location

  // Save State
  saveState: SaveState;

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
  initialViewMode?: ViewMode;
  mode?: ContentProviderMode;
  provider?: IContentProvider;
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({
  children,
  initialContent: propInitialContent = '',
  initialActiveEntryId,
  initialViewMode,
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
  const [sections, setSectionsState] = useState<Section[] | null>(null);
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  const debouncedContent = useDebounce(content, 5000); // 5s debounce
  const lastSavedContent = useRef(propInitialContent);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // History selection (only active when mode='history')
  const historySelectionHook = useHistorySelection();

  // Detect content changes (immediate)
  useEffect(() => {
    if (provider.capabilities.canWrite && routeId && content !== lastSavedContent.current && saveState === 'idle') {
      setSaveState('changed');
    }
  }, [content, lastSavedContent, provider, routeId, saveState]);

  // Auto-save effect
  useEffect(() => {
    // Only auto-save if we have an ID (existing note) and content changed
    // Use activeEntryId if available as it's the resolved full UUID
    const targetId = historySelectionHook.activeEntryId || routeId;

    if (provider.capabilities.canWrite && targetId && debouncedContent !== lastSavedContent.current) {
      const titleMatch = debouncedContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';

      console.log(`[WorkbenchContext] Auto-saving content for ${targetId}...`);
      setSaveState('saving');

      provider.updateEntry(targetId, {
        rawContent: debouncedContent,
        title: title
      }).then(() => {
        lastSavedContent.current = debouncedContent;
        console.log('[WorkbenchContext] Auto-save complete');
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 3000);
      }).catch(err => {
        console.error('[WorkbenchContext] Auto-save failed:', err);
        setSaveState('error');
      });
    }
  }, [debouncedContent, provider, routeId, historySelectionHook.activeEntryId]);

  // Save on unmount if dirty (Flush pending changes)
  useEffect(() => {
    return () => {
      const targetId = historySelectionHook.activeEntryId || routeId;
      if (provider.capabilities.canWrite && targetId && contentRef.current !== lastSavedContent.current) {
        console.log(`[WorkbenchContext] Flushing final save for ${targetId}...`);
        const titleMatch = contentRef.current.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';

        provider.updateEntry(targetId, {
          rawContent: contentRef.current,
          title: title
        }).catch(err => console.error('[WorkbenchContext] Final flush failed:', err));
      }
    };
  }, [provider, routeId]); // Dependencies are intentionally minimal to allow cleanup to use latest refs

  // Browser-level exit protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (contentRef.current !== lastSavedContent.current) {
        e.preventDefault();
        e.returnValue = ''; // Shows the "uncommitted changes" browser dialog
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Sync content when ID changes or propInitialContent changes
  useEffect(() => {
    const loadContent = async () => {
      if (routeId) {
        if (provider.mode === 'history') {
          try {
            console.log(`[WorkbenchProvider] Attempting to load entry for ID: ${routeId}`);
            const entry = await provider.getEntry(routeId);
            if (entry) {
              console.log(`[WorkbenchProvider] Successfully loaded entry: ${entry.title} (${entry.id})`);
              setContent(entry.rawContent);
              setSectionsState(entry.sections || null);
              lastSavedContent.current = entry.rawContent; // Sync ref so we don't auto-save immediately
              setSaveState('idle'); // Reset any lingering save state

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
    // Priority 1: Direct route parameters
    if (routeView === 'plan' || routeView === 'track' || routeView === 'review' || routeView === 'analyze' || routeView === 'history') {
      return routeView as ViewMode;
    }

    // Priority 2: Forced initial mode for static/storybook setups
    const isStorybook = pathname.includes('iframe.html');
    const isRootOrPlayground = pathname === '/' || pathname === '/history' || pathname.startsWith('/playground') || isStorybook;
    if (initialViewMode && (isRootOrPlayground || !routeView)) {
      return initialViewMode;
    }

    // Priority 3: Root redirects
    if (pathname === '/' || pathname.startsWith('/history') || isStorybook) {
      if (!routeId && resolvedMode === 'static') return 'plan';
      return 'history';
    }

    // Priority 4: Default based on ID
    if (routeId || pathname.startsWith('/playground')) return 'plan';

    return resolvedMode === 'history' ? 'history' : 'plan';
  }, [pathname, routeView, routeId, resolvedMode, initialViewMode]);

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

    // Single-select mode (when an entry is open via URL or state, or we are explicitly in a workout view)
    const isWorkoutView = viewMode === 'plan' || viewMode === 'track' || viewMode === 'review';
    if (routeId || historySelectionHook.activeEntryId || isWorkoutView) return 'single-select';

    // Default browse mode
    return 'history-only';
  }, [resolvedMode, historySelectionHook.selectedIds.size, historySelectionHook.activeEntryId, routeId]);

  // Guard viewMode setter: navigate to the new route
  const setViewMode = useCallback((newMode: ViewMode) => {
    if (resolvedMode === 'static' && (newMode === 'history' || newMode === 'analyze')) {
      return; // Safety guard — these views don't exist in static mode
    }

    if (newMode === 'history') {
      navigate('/');
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

    // Explicitly set saved state if we successfully save below
    // (Actual save logic handles promise)

    // Auto-save if provider supports writing
    if (provider.capabilities.canWrite) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Workout';

      const payload = {
        title,
        rawContent: content,
        results: result // Pass full result object
      };

      if (routeId) {
        provider.updateEntry(routeId, payload)
          .catch(err => console.error('Failed to auto-update workout:', err));
      } else {
        // Auto-tag with active notebook
        const tags: string[] = [];
        const activeNotebookId = localStorage.getItem('wodwiki:active-notebook');
        if (activeNotebookId) {
          tags.push(toNotebookTag(activeNotebookId));
        }
        provider.saveEntry({
          ...payload,
          tags,
          notes: '',
          targetDate: Date.now()
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
    sections,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    saveState,
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
    saveState,
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
