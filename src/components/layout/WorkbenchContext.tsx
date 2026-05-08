import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { WodBlock, WorkoutResults, Section } from '../Editor/types';
import type { ViewMode } from '@/panels/panel-system/ResponsiveViewport';
import type { PanelLayoutState } from '@/panels/panel-system/types';
import type { ContentProviderMode, IContentProvider } from '../../types/content-provider';
import type { HistoryEntry, StripMode } from '../../types/history';
import { useHistorySelection } from '../../hooks/useHistorySelection';
import type { UseHistorySelectionReturn } from '../../hooks/useHistorySelection';
import { StaticContentProvider, fileProcessor } from '@/hooks/useBrowserServices';
import { createNotePersistence, type INotePersistence } from '@/services/persistence';
import { sharedParser } from '@/hooks/useRuntimeParser';
import { getWodContent } from '@/repositories/wod-loader';
import { toNotebookTag } from '../../types/notebook';
import { useDebounce } from '../../hooks/useDebounce';
import { useRef } from 'react';
import { parseDocumentSections, matchSectionIds } from '../Editor/utils/sectionParser';
import { parseWodBlock } from '../Editor/utils/parseWodBlock';
import type { Section as EditorSection } from '../Editor/types/section';
import { INavigationProvider } from '@/types/navigation';
import { useReactRouterNavigation } from '@/hooks/useReactRouterNavigation';
import { useWorkbenchSyncStore } from './workbenchSyncStore';

/**
 * WorkbenchContext - Manages document state and view navigation
 *
 * DECOUPLED: Runtime management has been moved to ScriptRuntimeProvider.
 * This context now focuses solely on:
 * - Document state (content, blocks, active/selected block)
 * - View mode navigation
 * - Workout results collection
 * - Panel layout state (for responsive panel system)
 *
 * Components needing runtime should use useScriptRuntime() from ScriptRuntimeProvider.
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
  // selectedBlockId removed from context — canonical source is workbenchSyncStore
  viewMode: ViewMode;

  // Route context — section & result filtering from URL
  routeSectionId: string | undefined;
  routeResultId: string | undefined;

  // Results State
  results: WorkoutResults[];

  // Panel Layout State (per-view)
  panelLayouts: Record<string, PanelLayoutState>;

  // Content Provider
  provider: IContentProvider;
  notePersistence: INotePersistence;

  // Navigation Provider
  navigation: INavigationProvider;

  // Content Provider Mode
  contentMode: ContentProviderMode;

  // Strip mode (derived from content mode + selection)
  stripMode: StripMode;

  // History selection (null when contentMode='static')
  historySelection: UseHistorySelectionReturn | null;

  // History entries (empty when contentMode='static')
  historyEntries: HistoryEntry[];
  setHistoryEntries: (entries: HistoryEntry[]) => void;

  // Active entry
  currentEntry: HistoryEntry | null;

  // Attachments
  attachments: import('../../types/storage').Attachment[];

  // Actions
  setContent: (content: string) => void;
  setBlocks: (blocks: WodBlock[]) => void;
  setActiveBlockId: (id: string | null) => void;
  selectBlock: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  startWorkout: (block: WodBlock) => void;
  completeWorkout: (results: WorkoutResults) => void;
  resetResults: () => void;

  // Panel Layout Actions
  expandPanel: (viewId: string, panelId: string) => void;
  collapsePanel: (viewId: string) => void;

  // Attachment Actions
  addAttachment: (file: File) => Promise<void>;
  deleteAttachment: (id: string) => Promise<void>;
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
  navigation?: INavigationProvider;
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({
  children,
  initialContent: propInitialContent = '',
  initialActiveEntryId,
  initialViewMode,
  mode: _mode = 'static',
  provider: externalProvider,
  navigation: externalNavigation,
}) => {
  // Use provided navigation or default to a hook-based one
  const defaultNavigation = useReactRouterNavigation();
  const navigation = externalNavigation ?? defaultNavigation;

  // Derive route context from the navigation state
  const { noteId: routeId, sectionId: routeSectionId, resultId: routeResultId, view: viewMode } = navigation.state;
  const routeView = viewMode;

  const { pathname, search, hash, state: locationState } = useLocation();

  // Resolve provider: use external if given, else auto-create from mode + initialContent
  const provider = useMemo(() => externalProvider ?? new StaticContentProvider(propInitialContent), [externalProvider, propInitialContent]);
  const notePersistence = useMemo(() => createNotePersistence(provider), [provider]);
  const resolvedMode = provider.mode;

  // State Declarations
  const [content, setContent] = useState(propInitialContent);
  const [sections, setSectionsState] = useState<Section[] | null>(null);
  const [blocks, setBlocksState] = useState<WodBlock[]>([]);
  const [attachments, setAttachments] = useState<import('../../types/storage').Attachment[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | null>(null);

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
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Session';

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
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled Session';

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
      // Clear current note state while loading to avoid stale comparisons
      setContent('');
      setBlocksState([]);
      setSectionsState(null);
      setCurrentEntry(null);
      setAttachments([]);

      if (routeId) {
        if (provider.mode === 'history' || provider.mode === 'static') {
          try {
            console.log(`[WorkbenchProvider] Attempting to load entry for ID: ${routeId}`);
            const resultSelection = routeResultId
              ? { mode: 'by-result-id' as const, resultId: routeResultId }
              : routeSectionId && routeView === 'review'
                ? { mode: 'latest-for-section' as const, sectionId: routeSectionId }
                : { mode: 'latest' as const };
            const entry = await notePersistence.getNote(routeId, {
              projection: routeView === 'review' ? 'review' : 'workbench',
              includeAttachments: true,
              includeSections: true,
              resultSelection,
            }).catch(async err => {
              console.warn('[WorkbenchProvider] Note persistence projection failed, falling back to provider entry:', {
                routeId,
                projection: routeView === 'review' ? 'review' : 'workbench',
                resultSelectionMode: resultSelection.mode,
                err,
              });
              return provider.getEntry(routeId);
            });
            if (entry) {
              console.log(`[WorkbenchProvider] Successfully loaded entry: ${entry.title} (${entry.id})`);
              setCurrentEntry(entry);
              setContent(entry.rawContent);
              setSectionsState(entry.sections || null);
              lastSavedContent.current = entry.rawContent; // Sync ref so we don't auto-save immediately
              setSaveState('idle'); // Reset any lingering save state

              const entryAttachments = entry.attachments
                ?? await provider.getAttachments(entry.id).catch(err => {
                  console.warn('[WorkbenchContext] Failed to load attachments:', err);
                  return [];
                });
              setAttachments(entryAttachments);

              // Ensure visual selection matches the resolved entry.
              // Supports friendly name routes like /note/annie/plan.
              historySelectionHook.openEntry(entry.id);
              return;
            } else if (provider.mode === 'static') {
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
        }
      } else if (initialActiveEntryId && !historySelectionHook.activeEntryId) {
        historySelectionHook.openEntry(initialActiveEntryId);
      }

      // Default fallback
      setContent(propInitialContent);
    };

    loadContent();
  }, [routeId, propInitialContent, provider, notePersistence, routeView, routeResultId, routeSectionId, historySelectionHook.openEntry, initialActiveEntryId]);

  // Refetch attachments on addition or deletion
  const refreshAttachments = useCallback(async () => {
    const targetId = currentEntry?.id || routeId;
    if (targetId) {
      const entry = await notePersistence.getNote(targetId, { projection: 'workbench', includeAttachments: true });
      setAttachments(entry.attachments ?? []);
    }
  }, [currentEntry?.id, routeId, notePersistence]);


  const setBlocks = useCallback((newBlocks: WodBlock[]) => {
    // Allow external updates (e.g. from SectionEditor) to reflect changes immediately
    // before the debounced content update triggers a re-parse.
    setBlocksState(newBlocks);
  }, []);

  // --- Load route-specific result for review view ---
  // When the URL contains a sectionId (and optionally resultId), load the
  // matching WorkoutResult from IndexedDB and patch currentEntry.results
  // so that useWorkbenchEffects renders analytics for the correct result.
  useEffect(() => {
    if (!currentEntry || routeView !== 'review') return;
    if (!routeSectionId && !routeResultId) return;

    let cancelled = false;

    async function loadRouteResult() {
      try {
        // Optimization: Check navigation state first (passed from completeWorkout)
        if (locationState && (locationState as any).result) {
          const passedResult = (locationState as any).result as WorkoutResults;
          // If passedResult corresponds to this view (weak check, but good for immediate transition)
          // We assume if state is present, it's relevant.
          if (!cancelled) {
            setCurrentEntry(prev => prev ? ({ ...prev, results: passedResult }) : prev);
            return;
          }
        }

        const entry = await notePersistence.getNote(currentEntry!.id, {
          projection: 'review',
          resultSelection: routeResultId
            ? { mode: 'by-result-id', resultId: routeResultId }
            : { mode: 'latest-for-section', sectionId: routeSectionId! },
        });

        if (!cancelled) {
          setCurrentEntry(prev => prev ? ({ ...prev, results: entry.results }) : prev);
        }
      } catch (err) {
        console.error('[WorkbenchContext] Failed to load route-specific result:', err);
      }
    }

    loadRouteResult();

    return () => { cancelled = true; };
  }, [currentEntry?.id, routeView, routeSectionId, routeResultId, locationState, notePersistence]);

  // Derived state: Parse content into sections and blocks whenever content changes
  useEffect(() => {
    if (!content) {
      setSectionsState([]);
      setBlocksState([]);
      return;
    }

    const newSections = parseDocumentSections(content);

    // Stabilize IDs to avoid losing selection/runtime state
    const stabilizedSections = sections
      ? matchSectionIds(sections, newSections)
      : newSections;

    setSectionsState(stabilizedSections);

    const newBlocks: WodBlock[] = stabilizedSections
      .filter((s: EditorSection) => s.type === 'wod' && s.wodBlock)
      .map((s: EditorSection) => {
        const block = s.wodBlock!;
        if (!block.statements || block.statements.length === 0) {
          try {
            const result = parseWodBlock(block.content, sharedParser);
            return {
              ...block,
              statements: result.statements,
              errors: result.errors,
              state: (result.success ? 'parsed' : 'error') as any,
            };
          } catch (e) {
            console.error('[WorkbenchContext] Block parse error:', e);
          }
        }
        return block;
      });

    setBlocksState(newBlocks);
  }, [content]);

  // Execution State (runtime now managed by RuntimeProvider)
  // selectedBlockId is read directly from the Zustand store — no local state needed.
  const selectedBlockId = useWorkbenchSyncStore(s => s.selectedBlockId);

  // Results State
  const [results, setResults] = useState<WorkoutResults[]>([]);

  // Panel Layout State (per-view)
  const [panelLayouts, setPanelLayouts] = useState<Record<string, PanelLayoutState>>({});

  // History entries (managed externally, stored here for context sharing)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // Load history entries from provider on mount
  useEffect(() => {
    if (resolvedMode === 'history' && provider.capabilities.canFilter) {
      provider.getEntries().then(setHistoryEntries).catch(err => {
        console.error('[WorkbenchContext] Failed to load history entries:', err);
      });
    }
  }, [provider, resolvedMode]);

  // (Selection sync now handled within loadContent effect above)

  const historySelection = resolvedMode === 'history' ? historySelectionHook : null;

  // Sync selectedBlockId with routeSectionId from the URL (enables deep-linking/refresh)
  useEffect(() => {
    if (routeSectionId) {
      if (routeSectionId !== selectedBlockId) {
        useWorkbenchSyncStore.getState().setSelectedBlockId(routeSectionId);
      }
    } else if (selectedBlockId && viewMode !== 'plan') {
      // Clear selection when navigating away from a specific track/review section
      // (but keep it in plan mode as it might represent the cursor-focused block)
      
      // Only clear if the pathname explicitly ends with /track or /review (no ID segment).
      if (pathname.match(/\/(track|review)\/?$/)) {
        useWorkbenchSyncStore.getState().setSelectedBlockId(null);
      }
    }
  }, [routeSectionId, selectedBlockId, viewMode, pathname]);

  // Handle broken links on Track view -> redirect to Plan only for genuinely broken links
  // (Case 1 removed: Track without sectionId now shows the WorkoutPreviewPanel)
  useEffect(() => {
    // Wait for blocks to be available before making a decision
    if (blocks.length === 0 || viewMode !== 'track') return;

    // Wait for the correct note to be loaded to avoid false notFound redirects
    // when switching URLs but holding old note content.
    const isCorrectNoteLoaded = !routeId || currentEntry?.id === routeId || currentEntry?.id.endsWith(routeId);
    if (!isCorrectNoteLoaded) return;

    // No section ID or already on not-found path → show preview panel (no redirect)
    if (!routeSectionId || routeSectionId === 'notfound') return;

    // Case 2: Link is broken (ID not found in current blocks)
    const hasExact = blocks.some(b => b.id === selectedBlockId);
    if (!hasExact) {
      // Try hash-based matching first (self-healing for IDs shifted by line number changes)
      const generatedMatch = selectedBlockId?.match(/^wod-\d+-([a-f0-9]{8})$/);
      if (generatedMatch) {
        const targetHash = generatedMatch[1];
        const match = blocks.find(b => {
          let h = 0;
          const c = b.content;
          for (let i = 0; i < c.length && i < 64; i++) h = ((h << 5) - h + c.charCodeAt(i)) | 0;
          return (h >>> 0).toString(16).padStart(8, '0') === targetHash;
        });

        if (match) {
          console.log(`[WorkbenchContext] Block shifted. Healing ID: ${selectedBlockId} -> ${match.id}`);
          useWorkbenchSyncStore.getState().setSelectedBlockId(match.id);
          if (routeId) {
            navigation.goToTrack(routeId, match.id);
          }
          return;
        }
      }

      // If hash matching also fails, the link is truly broken
      console.log(`[WorkbenchContext] Block NOT found for ID: ${selectedBlockId}. Redirecting to Track selection with notfound route.`);
      navigation.goToTrack(routeId || '', 'notfound');
    }
  }, [blocks, selectedBlockId, routeId, navigation, viewMode, routeSectionId, currentEntry?.id]);

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

    navigation.goTo(newMode, { noteId: routeId });
  }, [resolvedMode, navigation, routeId]);

  const selectBlock = useCallback((id: string | null) => {
    useWorkbenchSyncStore.getState().setSelectedBlockId(id);
  }, []);

  const startWorkout = useCallback((block: WodBlock) => {
    useWorkbenchSyncStore.getState().setSelectedBlockId(block.id);
    // Navigate to track view with the block's id as the section identifier
    navigation.goToTrack(routeId || 'static', block.id);
  }, [routeId, navigation]);

  const completeWorkout = useCallback((result: WorkoutResults) => {
    const resultId = uuidv4(); // Generate deterministic ID for this result
    const latestContent = contentRef.current;
    console.log(`[WorkbenchContext] Workout complete. Generated resultId: ${resultId} for section: ${selectedBlockId}. Content length: ${latestContent.length}`);

    // Auto-save in BACKGROUND if provider supports writing
    // We do NOT wait for this to finish to avoid blocking the UI
    if (provider.capabilities.canWrite) {
      const titleMatch = latestContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Session';

      const payload = {
        title,
        rawContent: latestContent,
        results: result, // Pass full result object
        sectionId: selectedBlockId ?? undefined, // Link result to the WOD section
        resultId, // Pass the ID we generated
      };

      if (routeId || provider.mode === 'static') {
        const targetId = routeId || 'static';
        console.log(`[WorkbenchContext] Updating provider entry ${targetId}...`);
        notePersistence.mutateNote(targetId, {
          rawContent: payload.rawContent,
          metadata: { title: payload.title },
          workoutResult: {
            id: payload.resultId,
            sectionId: payload.sectionId,
            data: payload.results,
          },
        })
          .then(updated => {
            console.log(`[WorkbenchContext] Provider updated. extendedResults count: ${updated.extendedResults?.length || 0}`);
            // Update local state if this is the currently loaded entry
            if (currentEntry?.id === updated.id || provider.mode === 'static') {
              console.log('[WorkbenchContext] Syncing currentEntry state with provider update');
              setCurrentEntry(updated);
            }
          })
          .catch(err => console.error('[WorkbenchContext] Failed to auto-update workout:', err));
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
        })
          .then(saved => {
            // If we didn't have a routeId, this new entry becomes the current one
            setCurrentEntry(saved);
          })
          .catch(err => console.error('Failed to auto-save workout:', err));
      }
    }

    setResults(prev => [...prev, result]);

    // Navigate to Review with the specific result ID IMMEDIATELY
    // Pass the result object in state so the destination can use it without waiting for IDB
    navigation.goToReview(routeId || 'static', selectedBlockId ?? undefined, resultId);
  }, [provider, notePersistence, routeId, selectedBlockId, navigation]);

  const resetResults = useCallback(() => {
    setResults([]);
  }, []);

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

  const addAttachment = useCallback(async (file: File) => {
    const targetId = currentEntry?.id || routeId;
    if (!targetId || !provider.capabilities.canWrite) return;

    console.log(`[WorkbenchContext] Processing attachment: ${file.name}`);
    const metadata = await fileProcessor.process(file);

    console.log(`[WorkbenchContext] Saving attachment to entry ${targetId}`);
    await notePersistence.mutateNote(targetId, {
      attachments: {
        add: [{
          id: uuidv4(),
          label: metadata.label,
          mimeType: metadata.mimeType,
          data: metadata.data,
          timeSpan: metadata.timeSpan ?? { start: Date.now(), end: Date.now() },
        }],
      },
    });
    
    // Trigger a re-load of the entry or just fire an event
    await refreshAttachments();
    console.log('[WorkbenchContext] Attachment saved successfully');
  }, [currentEntry?.id, routeId, provider, notePersistence, refreshAttachments]);

  const deleteAttachment = useCallback(async (id: string) => {
    const targetId = currentEntry?.id || routeId;
    if (!targetId || !provider.capabilities.canWrite) return;
    await notePersistence.mutateNote(targetId, {
      attachments: { remove: [id] },
    });
    await refreshAttachments();
    console.log(`[WorkbenchContext] Attachment ${id} deleted`);
  }, [provider, notePersistence, currentEntry?.id, routeId, refreshAttachments]);

  const value = useMemo(() => ({
    content,
    sections,
    blocks,
    activeBlockId,
    viewMode,
    routeSectionId,
    routeResultId,
    results,
    saveState,
    panelLayouts,
    provider,
    notePersistence,
    navigation,
    contentMode: resolvedMode,
    stripMode,
    historySelection,
    historyEntries,
    setHistoryEntries,
    currentEntry,
    attachments,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    resetResults,
    expandPanel,
    collapsePanel,
    addAttachment,
    deleteAttachment,
  }), [
    content,
    blocks,
    activeBlockId,
    viewMode,
    routeSectionId,
    routeResultId,
    results,
    saveState,
    panelLayouts,
    provider,
    notePersistence,
    navigation,
    resolvedMode,
    stripMode,
    historySelection,
    historyEntries,
    setHistoryEntries,
    currentEntry,
    attachments,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    resetResults,
    expandPanel,
    collapsePanel,
    addAttachment,
    deleteAttachment,
  ]);

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
};
