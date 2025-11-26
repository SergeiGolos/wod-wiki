import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WodBlock, WorkoutResults } from '../../markdown-editor/types';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ViewMode } from './SlidingViewport';
import { WodScript } from '../../parser/WodScript';
import { globalCompiler } from '../../runtime-test-bench/services/testbench-services';

interface WorkbenchContextState {
  // Document State
  content: string;
  blocks: WodBlock[];
  activeBlockId: string | null; // Cursor location
  
  // Execution State
  selectedBlockId: string | null; // Target for execution
  viewMode: ViewMode;
  runtime: ScriptRuntime | null;
  
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

  // Execution State
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);

  // Results State
  const [results, setResults] = useState<WorkoutResults[]>([]);

  // Initialize Runtime when selected block changes
  useEffect(() => {
    const selectedBlock = blocks.find(b => b.id === selectedBlockId);
    
    if (selectedBlock && selectedBlock.statements && viewMode === 'track') {
      console.log('[WorkbenchContext] Initializing runtime for block:', selectedBlock.id);
      const script = new WodScript(selectedBlock.content, selectedBlock.statements);
      const newRuntime = new ScriptRuntime(script, globalCompiler);
      
      const rootBlock = globalCompiler.compile(selectedBlock.statements as any, newRuntime);
      
      if (rootBlock) {
        newRuntime.stack.push(rootBlock);
        const actions = rootBlock.mount(newRuntime);
        actions.forEach(action => action.do(newRuntime));
      }

      setRuntime(newRuntime);
    } else if (viewMode !== 'track') {
      setRuntime(null);
    }
  }, [selectedBlockId, viewMode, blocks]);

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
    runtime,
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
