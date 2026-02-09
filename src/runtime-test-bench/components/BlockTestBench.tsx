import React, { useState, useEffect } from 'react';
import { EditorPanel } from './EditorPanel';
import { RuntimeStackPanel } from './RuntimeStackPanel';
import { MemoryPanel } from './MemoryPanel';
import { BlockTestControls } from './BlockTestControls';
import { ResultsTable } from './ResultsTable';
import { useTestBenchContext } from '../context/TestBenchContext';
import { useTestBenchRuntime } from '../hooks/useTestBenchRuntime';
import { globalParser } from '../services/testbench-services';

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

  const [viewMode, setViewMode] = useState<'stack' | 'memory'>('stack');

  const { runtime, execution, compileScript, updateSnapshot, resetRuntime } = useTestBenchRuntime({
    dispatch,
  });
  const { status } = execution;

  // Initialize script
  useEffect(() => {
    if (initialScript && !code) {
      dispatch({ type: 'SET_CODE', payload: initialScript });
    }
  }, [initialScript, code, dispatch]);

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
    const script = globalParser.read(wodContent);
    compileScript(script);
  };

  const handleRestart = () => {
    if (runtime) {
      execution.stop();
      runtime.dispose();
    }
    resetRuntime();
    // Re-start after reset
    setTimeout(() => handleStart(), 0);
  };

  const handleNext = () => {
    if (!runtime) {
      handleStart();
      return;
    }

    const nextEvent = {
      name: 'next',
      timestamp: new Date(),
      data: {}
    };
    runtime.handle(nextEvent);
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
