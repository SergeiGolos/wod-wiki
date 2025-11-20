import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { RuntimeStackPanel } from './components/RuntimeStackPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { Toolbar } from './components/Toolbar';
import { CompilationPanel } from './components/CompilationPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { StatusFooter } from './components/StatusFooter';
import { useTestBenchShortcuts } from './hooks/useTestBenchShortcuts';
import { useHighlighting } from './hooks/useHighlighting';
import { useRuntimeExecution } from './hooks/useRuntimeExecution';
import { RuntimeTestBenchProps, ExecutionSnapshot, ParseResults } from './types/interfaces';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { RuntimeAdapter } from './adapters/RuntimeAdapter';
import { globalParser, globalCompiler } from './services/testbench-services';
import { WodScript } from '../parser/WodScript';

/**
 * Main Runtime Test Bench component
 * Integrates all 6 panels with state management and cross-panel interactions
 */
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps> = ({
  initialCode = '',
  onCodeChange,
  className = ''
}) => {
  // Use module-level parser and compiler singletons (Phase 1.1)
  const parser = globalParser;
  const compiler = globalCompiler;
  
  // Parse results state
  const [parseResults, setParseResults] = useState<ParseResults>({
    statements: [],
    errors: [],
    warnings: [],
    status: 'idle'
  });

  // Runtime state with adapter (created when needed)
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const adapter = new RuntimeAdapter();
  const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);

  // Basic state
  const [code, setCode] = useState(initialCode);
  const [compilationLog, setCompilationLog] = useState<any[]>([]); // TODO: Type with LogEntry interface
  
  // Debounce timer ref for parsing
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Phase 2.1: Use execution hook for runtime lifecycle management
  const execution = useRuntimeExecution(runtime);
  
  // Destructure for convenience (maintain compatibility with existing code)
  const { status, elapsedTime } = execution;

  // Extract state from snapshot
  const blocks = snapshot?.stack.blocks || [];
  const memory = snapshot?.memory.entries || [];

  // Handle code changes with debounced parsing
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
    
    // Clear existing timer
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }

    // Set parsing status immediately
    setParseResults(prev => ({ ...prev, status: 'parsing' }));

    // Debounce parse (500ms)
    parseTimerRef.current = setTimeout(() => {
      try {
        const startTime = performance.now();
        const script = parser.read(newCode);
        const parseTime = performance.now() - startTime;

        setParseResults({
          statements: script.statements,
          errors: (script.errors || []).map((err: any) => ({
            line: err.token?.startLine || 0,
            column: err.token?.startColumn || 0,
            message: err.message || 'Parse error',
            severity: 'error' as const
          })),
          warnings: [],
          status: (script.errors && script.errors.length > 0) ? 'error' : 'success',
          metadata: {
            parseTime,
            statementCount: script.statements.length,
            tokenCount: 0 // TODO: Get from lexer if needed
          }
        });
      } catch (error: any) {
        setParseResults(prev => ({
          ...prev,
          status: 'error',
          errors: [{
            line: 0,
            column: 0,
            message: error?.message || 'Unknown parse error',
            severity: 'error'
          }]
        }));
      }
    }, 500);
    
    // Update snapshot when code changes
    if (runtime) {
      updateSnapshot();
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
    };
  }, []);

  // Update snapshot from runtime
  const updateSnapshot = () => {
    if (runtime) {
      const newSnapshot = adapter.createSnapshot(runtime);
      setSnapshot(newSnapshot);
    }
  };

  // Update snapshot periodically when running
  useEffect(() => {
    if (status === 'running' && runtime) {
      const interval = setInterval(updateSnapshot, 100);
      return () => clearInterval(interval);
    }
  }, [status, runtime]);

  // Compile parsed statements to runtime blocks
  const handleCompile = useCallback(() => {
    try {
      // Check if we have statements to compile
      if (parseResults.statements.length === 0) {
        setCompilationLog([{
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: 'No statements to compile',
          level: 'warning'
        }]);
        return;
      }

      // Create a temporary runtime for compilation (will be replaced after successful compile)
      const tempRuntime = new ScriptRuntime(
        new WodScript(code, parseResults.statements as any, parseResults.errors as any),
        compiler
      );

      // Compile to runtime blocks
      const block = compiler.compile(parseResults.statements as any, tempRuntime);
      
      if (!block) {
        setCompilationLog([{
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: 'Compilation failed - no matching strategy found',
          level: 'error'
        }]);
        return;
      }

      // Success - update runtime and state
      setRuntime(tempRuntime);

      setCompilationLog([{
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: `Compilation successful. Block type: ${block.blockType}`,
        level: 'success'
      }]);
      
      updateSnapshot();
    } catch (error: any) {
      setCompilationLog([{
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: `Compilation error: ${error.message || 'Unknown error'}`,
        level: 'error'
      }]);
    }
  }, [parseResults, code, compiler]);

  // Auto-compile when parse results change successfully
  useEffect(() => {
    if (parseResults.status === 'success' && parseResults.statements.length > 0) {
      handleCompile();
    }
  }, [parseResults.status, parseResults.statements.length, handleCompile]);

  // Phase 2.2: Execution handlers now managed by useRuntimeExecution hook
  // The hook handles all interval management, state transitions, and cleanup
  // We just wire the UI controls directly to execution.start/pause/stop/reset/step

  // Wrap hook methods to add logging and snapshot updates
  const handleExecute = useCallback(() => {
    if (!runtime) {
      setCompilationLog(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'No runtime available. Compile first.',
        level: 'error'
      }]);
      return;
    }

    execution.start();
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution started',
      level: 'info'
    }]);
  }, [runtime, execution.start]);

  const handlePause = useCallback(() => {
    execution.pause();
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution paused',
      level: 'info'
    }]);
  }, [execution.pause]);

  const handleStep = useCallback(() => {
    if (!runtime) {
      setCompilationLog(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: 'No runtime available. Compile first.',
        level: 'error'
      }]);
      return;
    }

    execution.step();
    updateSnapshot();
  }, [runtime, execution.step]);

  const handleStop = useCallback(() => {
    execution.stop();
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution stopped',
      level: 'info'
    }]);
  }, [execution.stop]);

  const handleReset = useCallback(() => {
    execution.reset();
    setRuntime(null);
    setSnapshot(null);

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Runtime reset - ready for new compilation',
      level: 'info'
    }]);
  }, [execution.reset]);

  // Keyboard shortcuts
  useTestBenchShortcuts({
    onPlay: status === 'idle' ? handleExecute : undefined,
    onPause: status === 'running' ? handlePause : undefined,
    onStop: status === 'running' || status === 'paused' ? handleStop : undefined,
    onReset: handleReset,
    onStep: status === 'paused' ? handleStep : undefined,
    onCompile: handleCompile
  });

  // Cross-panel highlighting
  const {
    highlightState,
    setBlockHighlight,
    setMemoryHighlight
  } = useHighlighting();

  // Responsive layout detection
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      if (width >= 1920) setViewport('desktop');
      else if (width >= 1024) setViewport('tablet');
      else setViewport('mobile');
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Layout classes based on viewport
  const getLayoutClasses = () => {
    switch (viewport) {
      case 'desktop':
        return 'bg-background text-foreground min-h-screen space-y-6';
      case 'tablet':
        return 'bg-background text-foreground min-h-screen space-y-4';
      case 'mobile':
        return 'bg-background text-foreground min-h-screen space-y-2';
      default:
        return 'bg-background text-foreground min-h-screen space-y-6';
    }
  };

  return (
    <div
      className={`${getLayoutClasses()} ${className}`}
      data-testid="runtime-test-bench-container"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toolbar */}
        <div>
          <Toolbar
          title="WOD Wiki Runtime Test Bench"
          navigationItems={[
            { id: 'editor', label: 'Editor', path: 'editor', isActive: true },
            { id: 'runtime', label: 'Runtime', path: 'runtime', isActive: false },
            { id: 'debug', label: 'Debug', path: 'debug', isActive: false }
          ]}
          onNavigate={() => {}} // TODO: Implement navigation
          actionButtons={[
            { id: 'compile', label: 'Compile', icon: '⚙️', disabled: status === 'running' },
            { id: 'execute', label: status === 'paused' ? 'Resume' : 'Run', icon: '▶️', disabled: status === 'running' },
            { id: 'pause', label: 'Pause', icon: '⏸️', disabled: status !== 'running' },
            { id: 'stop', label: 'Stop', icon: '⏹️', disabled: status === 'idle' },
            { id: 'reset', label: 'Reset', icon: '🔄', disabled: false },
            { id: 'step', label: 'Step', icon: '👟', disabled: status !== 'paused' }
          ]}
          onAction={(actionId) => {
            switch (actionId) {
              case 'compile': handleCompile(); break;
              case 'execute': handleExecute(); break;
              case 'pause': handlePause(); break;
              case 'stop': handleStop(); break;
              case 'reset': handleReset(); break;
              case 'step': handleStep(); break;
            }
          }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg p-4">
            <EditorPanel
          value={code}
          onChange={handleCodeChange}
          highlightedLine={highlightState.line}
          errors={parseResults.errors}
          status={parseResults.status === 'success' ? 'valid' : 
                  parseResults.status === 'parsing' ? 'parsing' : 
                  parseResults.status === 'error' ? 'error' : 'idle'}
          readonly={false}
            />
          </div>

          {/* Compilation Panel */}
          <div className="bg-card rounded-lg p-4">
            <CompilationPanel
          statements={parseResults.statements}
          activeTab="output"
          onTabChange={() => {}}
          compilationLog={compilationLog}
          errors={parseResults.errors}
          warnings={[]}
            />
          </div>

          {/* Runtime Stack Panel */}
          <div className="bg-card rounded-lg p-4">
            <RuntimeStackPanel
          blocks={blocks}
          highlightedBlockKey={highlightState.blockKey}
          onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
          onBlockClick={() => {}} // TODO: Implement block selection
            />
          </div>

          {/* Memory Panel */}
          <div className="bg-card rounded-lg p-4">
            <MemoryPanel
          entries={memory}
          highlightedMemoryId={highlightState.memoryId}
          onEntryHover={(memoryId) => setMemoryHighlight(memoryId, 'memory')}
          onEntryClick={() => {}} // TODO: Implement entry selection
          filterText=""
          onFilterChange={() => {}}
          groupBy="none"
          onGroupByChange={() => {}}
            />
          </div>
        </div>

        {/* Controls Panel */}
        <div className="bg-card rounded-lg p-4">
          <ControlsPanel
            status={status as any}
            enabled={true}
            stepMode={false}
            onPlayPause={handleExecute}
            onStop={handleStop}
            onReset={handleReset}
            onStep={handleStep}
            onStepModeToggle={() => {}}
            />
        </div>

        {/* Status Footer */}
        <div className="bg-card rounded-lg p-4">
          <StatusFooter
          status={status as any}
          elapsedTime={elapsedTime}
          blockCount={blocks.length}
        />
        </div>
      </div>
    </div>
  );
};

export default RuntimeTestBench;
