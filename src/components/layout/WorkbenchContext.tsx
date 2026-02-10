import React, { createContext, useContext, useState, useCallback } from 'react';
import { WodBlock, WorkoutResults } from '../../markdown-editor/types';
import { ViewMode } from './SlidingViewport';
import type { PanelLayoutState } from './panel-system/types';

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
}

export const WorkbenchProvider: React.FC<WorkbenchProviderProps> = ({
  children,
  initialContent = ''
}) => {
  // Document State
  const [content, setContent] = useState(initialContent);
  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Execution State (runtime now managed by RuntimeProvider)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');

  // Results State
  const [results, setResults] = useState<WorkoutResults[]>([]);

  // Panel Layout State (per-view)
  const [panelLayouts, setPanelLayouts] = useState<Record<string, PanelLayoutState>>({});

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

  const value = {
    content,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    panelLayouts,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout,
    expandPanel,
    collapsePanel,
  };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
};
