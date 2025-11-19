import React, { useState, useEffect, useRef } from 'react';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { CommandProvider } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { ContextPanel } from '../../markdown-editor/components/ContextPanel';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Runtime View Component
const RuntimeView = ({ activeBlock, onComplete }: { activeBlock: WodBlock | null, onComplete: () => void }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);

  // Timer tick effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRunning && startTime !== null) {
      intervalId = setInterval(() => {
        const now = Date.now();
        setElapsedMs(now - startTime + pausedTime);
      }, 10);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, startTime, pausedTime]);

  const handleStart = () => {
    setStartTime(Date.now());
    setIsRunning(true);
  };

  const handlePause = () => {
    if (startTime !== null) {
      setPausedTime(Date.now() - startTime + pausedTime);
    }
    setIsRunning(false);
    setStartTime(null);
  };

  const handleStop = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setStartTime(null);
    setPausedTime(0);
    onComplete();
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setStartTime(null);
    setPausedTime(0);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full p-8 bg-gray-900 text-white flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-8 text-gray-300">Workout Timer</h2>
      
      <div className="text-8xl font-mono font-bold mb-12 tabular-nums tracking-wider text-blue-400">
        {formatTime(elapsedMs)}
      </div>

      <div className="flex gap-6">
        {!isRunning ? (
          <Button 
            onClick={handleStart} 
            className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center"
          >
            <Play className="h-8 w-8 fill-current" />
          </Button>
        ) : (
          <Button 
            onClick={handlePause} 
            className="h-16 w-16 rounded-full bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center"
          >
            <Pause className="h-8 w-8 fill-current" />
          </Button>
        )}

        <Button 
          onClick={handleStop} 
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
        >
          <Square className="h-6 w-6 fill-current" />
        </Button>

        <Button 
          onClick={handleReset} 
          className="h-16 w-16 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>
      
      {activeBlock && (
        <div className="mt-12 p-4 bg-gray-800 rounded-lg max-w-md w-full">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Active Block</h3>
          <pre className="text-xs text-gray-500 overflow-hidden text-ellipsis">
            {activeBlock.id}
          </pre>
        </div>
      )}
    </div>
  );
};

// Analytics View Component
const AnalyticsView = ({ activeBlock, onContinue }: { activeBlock: WodBlock | null, onContinue: () => void }) => {
  // Fake data for the table
  const metrics = [
    { id: 1, metric: 'Total Time', value: '12:45', unit: 'min' },
    { id: 2, metric: 'Avg Heart Rate', value: '145', unit: 'bpm' },
    { id: 3, metric: 'Max Heart Rate', value: '178', unit: 'bpm' },
    { id: 4, metric: 'Calories', value: '320', unit: 'kcal' },
    { id: 5, metric: 'Rounds', value: '5', unit: 'rounds' },
    { id: 6, metric: 'Split 1', value: '2:15', unit: 'min' },
    { id: 7, metric: 'Split 2', value: '2:20', unit: 'min' },
    { id: 8, metric: 'Split 3', value: '2:35', unit: 'min' },
  ];

  return (
    <div className="h-full p-8 bg-white overflow-auto flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Workout Analysis</h2>
        <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700 text-white">
          Continue
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Performance Score</h3>
          <div className="text-4xl font-bold text-blue-900">92/100</div>
        </div>
        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
          <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Intensity Zone</h3>
          <div className="text-4xl font-bold text-green-900">High</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.metric}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.value}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {activeBlock && (
        <div className="mt-8 text-xs text-gray-400">
          Source Block: {activeBlock.id}
        </div>
      )}
    </div>
  );
};

export interface WodWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange'> {
  initialContent?: string;
}

export const WodWorkbench: React.FC<WodWorkbenchProps> = ({ 
  initialContent = "# My Workout\n\n```wod\nTimer: 10:00\n  - 10 Pushups\n  - 10 Situps\n```\n",
  ...editorProps
}) => {
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  const [, setBlocks] = useState<WodBlock[]>([]);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'edit' | 'run' | 'analyze'>('edit');

  // Block editor hooks
  const { addStatement, editStatement, deleteStatement } = useBlockEditor({
    editor: editorInstance,
    block: activeBlock
  });

  // Handle editor mount
  const handleEditorMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };

  // Scroll synchronization logic
  useEffect(() => {
    if (!editorInstance || !editorContainerRef.current) return;

    const editor = editorInstance;
    let lastScrollTop = editor.getScrollTop();
    let lastCursorLine = editor.getPosition()?.lineNumber || 1;
    let lastCursorTopOffset = editor.getTopForLineNumber(lastCursorLine) - lastScrollTop;

    const resizeObserver = new ResizeObserver(() => {
      const currentCursor = editor.getPosition();
      if (currentCursor) {
        lastCursorLine = currentCursor.lineNumber;
      }
      editor.layout();
      const newScrollTop = editor.getTopForLineNumber(lastCursorLine) - lastCursorTopOffset;
      editor.setScrollTop(newScrollTop);
    });

    resizeObserver.observe(editorContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [editorInstance]);

  // Update cursor offset reference when selection changes
  useEffect(() => {
    if (!editorInstance) return;
    const disposable = editorInstance.onDidChangeCursorPosition(() => {
      // Logic handled in ResizeObserver closure
    });
    return () => disposable.dispose();
  }, [editorInstance]);

  // Handlers
  const handleTrack = () => {
    setViewMode('run');
  };

  const handleComplete = () => {
    setViewMode('analyze');
  };

  const handleBackToEdit = () => {
    setViewMode('edit');
  };

  return (
    <CommandProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100">
        {/* Header / Navigation */}
        <div className="h-12 bg-gray-800 text-white flex items-center px-4 justify-between shrink-0 z-10">
          <div className="font-bold flex items-center gap-2">
            WOD Wiki Workbench
            <span className="text-xs font-normal bg-gray-700 px-2 py-0.5 rounded text-gray-300">
              {viewMode.toUpperCase()} MODE
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'edit' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setViewMode('run')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'run' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Runtime
            </button>
            <button
              onClick={() => setViewMode('analyze')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'analyze' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex">
          
          {/* Panel 1: Editor (Visible in Edit Mode) */}
          <div 
            className={`h-full border-r border-gray-200 transition-all duration-500 ease-in-out ${
              viewMode === 'edit' 
                ? (activeBlock ? 'w-2/3 opacity-100' : 'w-full opacity-100') 
                : 'w-0 opacity-0 overflow-hidden border-none'
            }`}
          >
            <div ref={editorContainerRef} className="h-full w-full">
              <MarkdownEditorBase 
                initialContent={initialContent}
                showContextOverlay={false}
                onActiveBlockChange={setActiveBlock}
                onBlocksChange={setBlocks}
                onMount={handleEditorMount}
                height="100%"
                {...editorProps}
              />
            </div>
          </div>

          {/* Panel 2: Staging (Visible in All Modes, but position/width changes) */}
          {/* In Edit Mode: Right side (1/3) */}
          {/* In Run/Analyze Mode: Left side (1/3) */}
          <div 
            className={`h-full border-r border-gray-200 transition-all duration-500 ease-in-out ${
              (viewMode === 'edit' && !activeBlock) ? 'w-0 opacity-0 overflow-hidden border-none' : 'w-1/3 opacity-100'
            }`}
          >
            {activeBlock ? (
              <ContextPanel 
                block={activeBlock} 
                onAddStatement={addStatement}
                onEditStatement={editStatement}
                onDeleteStatement={deleteStatement}
                onTrack={handleTrack}
              />
            ) : (
              <div className="p-4 text-gray-500 flex items-center justify-center h-full bg-gray-50">
                Select a WOD block to view details
              </div>
            )}
          </div>

          {/* Panel 3: Runtime (Visible in Run Mode) */}
          <div 
            className={`h-full border-r border-gray-200 transition-all duration-500 ease-in-out ${
              viewMode === 'run' ? 'w-2/3 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
            }`}
          >
            <RuntimeView activeBlock={activeBlock} onComplete={handleComplete} />
          </div>

          {/* Panel 4: Analytics (Visible in Analyze Mode) */}
          <div 
            className={`h-full border-r border-gray-200 transition-all duration-500 ease-in-out ${
              viewMode === 'analyze' ? 'w-2/3 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
            }`}
          >
            <AnalyticsView activeBlock={activeBlock} onContinue={handleBackToEdit} />
          </div>

        </div>
      </div>
      <CommandPalette />
    </CommandProvider>
  );
};
