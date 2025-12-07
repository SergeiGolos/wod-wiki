import React, { useState, useEffect } from 'react';
import { EditorPanel } from './EditorPanel';
import { RuntimeStackPanel } from './RuntimeStackPanel';
import { MemoryPanel } from './MemoryPanel';
import { BlockTestControls } from './BlockTestControls';
import { ResultsTable } from './ResultsTable';
import { useTestBenchContext } from '../context/TestBenchContext';
import { useRuntimeExecution } from '../hooks/useRuntimeExecution';
import { RuntimeAdapter } from '../adapters/RuntimeAdapter';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { globalParser, globalCompiler } from '../services/testbench-services';

interface BlockTestBenchProps {
  initialScript?: string;
  className?: string;
}

export const BlockTestBench: React.FC<BlockTestBenchProps> = ({
  initialScript = '',
  className = ''
}) => {
  const { state, dispatch } = useTestBenchContext();
  const { code, snapshot } = state;
  
  // Local runtime state
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const [viewMode, setViewMode] = useState<'stack' | 'memory'>('stack');
  
  const adapter = new RuntimeAdapter();
  const execution = useRuntimeExecution(runtime);
  const { status } = execution;

  // Initialize script
  useEffect(() => {
    if (initialScript && !code) {
      dispatch({ type: 'SET_CODE', payload: initialScript });
    }
  }, [initialScript, code, dispatch]);

  const handleStart = () => {
    // Create new runtime
    const script = globalParser.read(code);
    const newRuntime = new ScriptRuntime();
    const block = globalCompiler.compile(script.statements, newRuntime);
    
    newRuntime.stack.push(block);
    setRuntime(newRuntime);
    
    // Update snapshot
    const newSnapshot = adapter.createSnapshot(newRuntime);
    dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
  };

  const handleRestart = () => {
    if (runtime) {
      // runtime.dispose(); // ScriptRuntime might not have dispose, check implementation
    }
    handleStart();
  };

  const handleNext = () => {
    if (!runtime) {
      handleStart();
      return;
    }
    
    // Trigger next event
    runtime.handle({
      name: 'next',
      timestamp: new Date(),
      data: {}
    });
    
    // Update snapshot
    const newSnapshot = adapter.createSnapshot(runtime);
    dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
  };

  const handleCodeChange = (newCode: string) => {
    dispatch({ type: 'SET_CODE', payload: newCode });
  };

  const blocks = snapshot?.stack.blocks || [];
  const activeIndex = snapshot?.stack.activeIndex || 0;
  const memoryEntries = snapshot?.memory.entries || [];

  return (
    <div className={`flex flex-col h-screen bg-gray-100 ${className}`}>
      {/* Header */}
      <BlockTestControls 
        status={status}
        onStart={handleStart}
        onRestart={handleRestart}
        onNext={handleNext}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="p-2 bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase">
            WOD Script
          </div>
          <div className="flex-1 relative overflow-hidden">
             <EditorPanel 
               value={code} 
               onChange={handleCodeChange}
               status={status}
             />
          </div>
        </div>

        {/* Right: Stack/Memory */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="flex border-b border-gray-200">
            <button 
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'stack' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('stack')}
            >
              Visual Stack
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'memory' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('memory')}
            >
              Memory View
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {viewMode === 'stack' ? (
              <RuntimeStackPanel 
                blocks={blocks} 
                activeBlockIndex={activeIndex}
              />
            ) : (
              <MemoryPanel 
                entries={memoryEntries} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Results */}
      <div className="h-1/3 border-t border-gray-200 flex flex-col bg-white">
        <div className="p-2 bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-500 uppercase">
          Execution Results
        </div>
        <div className="flex-1 overflow-auto">
          <ResultsTable snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
};
