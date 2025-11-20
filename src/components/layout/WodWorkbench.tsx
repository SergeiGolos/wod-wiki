import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { CommandProvider } from '../../components/command-palette/CommandContext';
import { CommandPalette } from '../../components/command-palette/CommandPalette';
import { ContextPanel } from '../../markdown-editor/components/ContextPanel';
import { useBlockEditor } from '../../markdown-editor/hooks/useBlockEditor';
import { editor as monacoEditor } from 'monaco-editor';
import { Play, Pause, Square, RotateCcw, Edit, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';

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
    <div className="h-full p-8 bg-background text-foreground flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-8 text-muted-foreground">Workout Timer</h2>

      <div className="text-8xl font-mono font-bold mb-12 tabular-nums tracking-wider text-primary">
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
        <div className="mt-12 p-4 bg-card rounded-lg max-w-md w-full border border-border">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Active Block</h3>
          <pre className="text-xs text-foreground overflow-hidden text-ellipsis">
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
    <div className="h-full p-8 bg-background overflow-auto flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Workout Analysis</h2>
        <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700 text-white">
          Continue
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Performance Score</h3>
          <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">92/100</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
          <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Intensity Zone</h3>
          <div className="text-4xl font-bold text-green-900 dark:text-green-100">High</div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {metrics.map((item) => (
              <tr key={item.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.metric}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.value}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeBlock && (
        <div className="mt-8 text-xs text-muted-foreground">
          Source Block: {activeBlock.id}
        </div>
      )}
    </div>
  );
};

export interface WodWorkbenchProps extends Omit<MarkdownEditorProps, 'onMount' | 'onBlocksChange' | 'onActiveBlockChange'> {
  initialContent?: string;
}

const WodWorkbenchContent: React.FC<WodWorkbenchProps> = ({
  initialContent = "# My Workout\n\n```wod\nTimer: 10:00\n  - 10 Pushups\n  - 10 Situps\n```\n",
  theme: propTheme,
  ...editorProps
}) => {
  const { theme, setTheme } = useTheme();
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  const [, setBlocks] = useState<WodBlock[]>([]);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Sync prop theme to context theme (for Storybook controls)
  useEffect(() => {
    if (!propTheme) return;
    
    const targetTheme = (propTheme === 'vs-dark' || propTheme === 'wod-dark') ? 'dark' : 'light';
    // Only update if we're not in system mode and the theme is different
    if (theme !== 'system' && theme !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [propTheme]);

  // View Mode State
  const [viewMode, setViewMode] = useState<'edit' | 'run' | 'analyze'>('edit');

  // Compute Monaco theme reactively based on global theme
  const monacoTheme = useMemo(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let computedTheme: string;
    
    if (theme === 'system') {
      computedTheme = mediaQuery.matches ? 'vs-dark' : 'vs';
    } else {
      computedTheme = theme === 'dark' ? 'vs-dark' : 'vs';
    }
    
    console.log('[WodWorkbench] Theme computed - global:', theme, '→ monaco:', computedTheme);
    return computedTheme;
  }, [theme]);

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
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Header / Navigation */}
        <div className="h-14 bg-background border-b border-border flex items-center px-4 justify-between shrink-0 z-10">
          <div className="font-bold flex items-center gap-4">
            <div className="flex items-center">
              <img
                src="/images/wod-wiki-logo-light.png"
                alt="WOD Wiki"
                className="h-8 block dark:hidden"
              />
              <img
                src="/images/wod-wiki-logo-dark.png"
                alt="WOD Wiki"
                className="h-8 hidden dark:block"
              />
            </div>
            <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded text-muted-foreground">
              {viewMode.toUpperCase()} MODE
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <div className="h-6 w-px bg-border mx-2"></div>
            <Button
              variant={viewMode === 'edit' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('edit')}
              className={`gap-2 ${viewMode === 'edit' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Edit className="h-4 w-4" />
              Editor
            </Button>
            <Button
              variant={viewMode === 'run' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('run')}
              className={`gap-2 ${viewMode === 'run' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Play className="h-4 w-4" />
              Runtime
            </Button>
            <Button
              variant={viewMode === 'analyze' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('analyze')}
              className={`gap-2 ${viewMode === 'analyze' ? '' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BarChart2 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex">

          {/* Panel 1: Editor (Visible in Edit Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'edit'
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
                theme={monacoTheme}
              />
            </div>
          </div>

          {/* Panel 2: Staging (Visible in All Modes, but position/width changes) */}
          {/* In Edit Mode: Right side (1/3) */}
          {/* In Run/Analyze Mode: Left side (1/3) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${(viewMode === 'edit' && !activeBlock) ? 'w-0 opacity-0 overflow-hidden border-none' : 'w-1/3 opacity-100'
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
              <div className="p-4 text-muted-foreground flex items-center justify-center h-full bg-muted/20">
                Select a WOD block to view details
              </div>
            )}
          </div>

          {/* Panel 3: Runtime (Visible in Run Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'run' ? 'w-2/3 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
              }`}
          >
            <RuntimeView activeBlock={activeBlock} onComplete={handleComplete} />
          </div>

          {/* Panel 4: Analytics (Visible in Analyze Mode) */}
          <div
            className={`h-full border-r border-border transition-all duration-500 ease-in-out ${viewMode === 'analyze' ? 'w-2/3 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
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

export const WodWorkbench: React.FC<WodWorkbenchProps> = (props) => {
  // Determine default theme based on props
  const defaultTheme = useMemo(() => {
    if (props.theme === 'vs-dark' || props.theme === 'wod-dark') return 'dark';
    if (props.theme === 'vs' || props.theme === 'wod-light') return 'light';
    return 'dark';
  }, [props.theme]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey="wod-wiki-theme">
      <WodWorkbenchContent {...props} />
    </ThemeProvider>
  );
};
