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
import { RuntimeStack } from '../../runtime/RuntimeStack';
import { RuntimeClock } from '../../runtime/RuntimeClock';
import { EventBus } from '../../runtime/events/EventBus';
import { StartWorkoutAction } from '../../runtime/actions/stack/StartWorkoutAction';

interface BlockTestBenchProps {
  initialScript?: string;
  className?: string;
}

export const BlockTestBench: React.FC<BlockTestBenchProps> = ({
  initialScript = '',
  className = ''
}) => {
  const { state, dispatch } = useTestBenchContext();
  const { code, snapshot, selectedLine } = state;

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

  const updateSnapshot = () => {
    if (runtime) {
      const newSnapshot = adapter.createSnapshot(runtime);
      dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
    }
  };

  // Update snapshot when execution status changes
  useEffect(() => {
    if (status === 'running' && runtime) {
      const interval = setInterval(updateSnapshot, 100);
      return () => clearInterval(interval);
    }
  }, [status, runtime]);

  // Extract WOD content from markdown code blocks
  const extractWodContent = (text: string): string => {
    const wodBlockRegex = /```wod\s*\n([\s\S]*?)```/;
    const match = text.match(wodBlockRegex);
    return match ? match[1].trim() : text;
  };

  const handleStart = () => {
    if (runtime && (status === 'idle' || status === 'paused')) {
      execution.start();
      updateSnapshot();
      return;
    }

    // Extract WOD content from markdown if present
    const wodContent = extractWodContent(code);

    // Create new runtime with proper initialization
    const script = globalParser.read(wodContent);
    const dependencies = {
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    const newRuntime = new ScriptRuntime(script as any, globalCompiler, dependencies);
    
    // Initialize the workout by pushing root block via StartWorkoutAction
    newRuntime.do(new StartWorkoutAction());

    if (newRuntime.stack.count > 0) {
      setRuntime(newRuntime);

      // Update snapshot after runtime is initialized
      setTimeout(() => {
        const newSnapshot = adapter.createSnapshot(newRuntime);
        dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
      }, 0);
    }
  };

  const handleRestart = () => {
    if (runtime) {
      execution.stop();
      runtime.dispose();
    }
    setRuntime(null);
    dispatch({ type: 'SET_SNAPSHOT', payload: null });
    handleStart();
  };

  const handleNext = () => {
    if (!runtime) {
      handleStart();
      return;
    }

    // Use NextEvent directly for proper block advancement
        const nextEvent = {
      name: 'next',
      timestamp: new Date(),
      data: {}
    };
    runtime.eventBus.emit(nextEvent, runtime);
    updateSnapshot();
  };

  const handlePause = () => {
    execution.pause();
    updateSnapshot();
  };

  const handleCodeChange = (newCode: string) => {
    dispatch({ type: 'SET_CODE', payload: newCode });
  };

  const handleEditorClick = (lineNumber: number) => {
    dispatch({ type: 'SET_SELECTED_LINE', payload: lineNumber });
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
        onPause={handlePause}
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
              status={status as any}
              highlightedLine={selectedLine || undefined}
              onLineClick={handleEditorClick}
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
                highlightedLine={selectedLine || undefined}
              />
            ) : (
              <MemoryPanel
                entries={memoryEntries}
                groupBy="owner"
                highlightedLine={selectedLine || undefined}
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
          <ResultsTable snapshot={snapshot} highlightedLine={selectedLine || undefined} />
        </div>
      </div>
    </div>
  );
};
