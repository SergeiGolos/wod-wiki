import React, { createContext, useContext, useState, useCallback } from 'react';
import { WodBlock, WorkoutResults } from '../../markdown-editor/types';
import { ViewMode } from './SlidingViewport';

/**
 * WorkbenchContext - Manages document state and view navigation
 * 
 * DECOUPLED: Runtime management has been moved to RuntimeProvider.
 * This context now focuses solely on:
 * - Document state (content, blocks, active/selected block)
 * - View mode navigation
 * - Workout results collection
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
  
  // Actions
  setContent: (content: string) => void;
  setBlocks: (blocks: WodBlock[]) => void;
  setActiveBlockId: (id: string | null) => void;
  selectBlock: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  startWorkout: (block: WodBlock) => void;
  completeWorkout: (results: WorkoutResults) => void;
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

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const startWorkout = useCallback((block: WodBlock) => {
    setSelectedBlockId(block.id);
    setViewMode('track');
  }, []);

  const completeWorkout = useCallback((result: WorkoutResults) => {
    setResults(prev => [...prev, result]);
    setViewMode('analyze');
  }, []);

  const value = {
    content,
    blocks,
    activeBlockId,
    selectedBlockId,
    viewMode,
    results,
    setContent,
    setBlocks,
    setActiveBlockId,
    selectBlock,
    setViewMode,
    startWorkout,
    completeWorkout
  };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
};
