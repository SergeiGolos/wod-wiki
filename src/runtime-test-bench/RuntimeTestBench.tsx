import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { RuntimeStackPanel } from './components/RuntimeStackPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { Toolbar } from './components/Toolbar';
import { CompilationPanel } from './components/CompilationPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { StatusFooter } from './components/StatusFooter';
import { useTestBenchShortcuts } from './hooks/useTestBenchShortcuts';
import { useHighlighting } from './hooks/useHighlighting';
import { RuntimeTestBenchProps, ExecutionSnapshot, ParseResults } from './types/interfaces';
import { panelBase } from './styles/tailwind-components';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { RuntimeAdapter } from './adapters/RuntimeAdapter';
import { MdTimerRuntime } from '../parser/md-timer';
import { JitCompiler } from '../runtime/JitCompiler';
import { TimerStrategy, RoundsStrategy, EffortStrategy, IntervalStrategy, TimeBoundRoundsStrategy, GroupStrategy } from '../runtime/strategies';
import { WodScript } from '../WodScript';
import { NextEvent } from '../runtime/NextEvent';

/**
 * Main Runtime Test Bench component
 * Integrates all 6 panels with state management and cross-panel interactions
 */
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps> = ({
  initialCode = '',
  onCodeChange,
  className = ''
}) => {
  // Parser instance (stable across renders)
  const parser = useMemo(() => new MdTimerRuntime(), []);

  // Compiler instance with strategies registered in precedence order
  const compiler = useMemo(() => {
    const c = new JitCompiler();
    // Register strategies in order of specificity (most specific first)
    c.registerStrategy(new TimeBoundRoundsStrategy());  // Timer + Rounds/AMRAP (most specific)
    c.registerStrategy(new IntervalStrategy());         // Timer + EMOM
    c.registerStrategy(new TimerStrategy());            // Timer only
    c.registerStrategy(new RoundsStrategy());           // Rounds only
    c.registerStrategy(new GroupStrategy());            // Has children
    c.registerStrategy(new EffortStrategy());           // Fallback (everything else)
    return c;
  }, []);
  
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
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [compilationLog, setCompilationLog] = useState<any[]>([]); // TODO: Type with LogEntry interface
  
  // T085: Elapsed time tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);

  // Debounce timer ref
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Execution loop ref for pause/resume
  const executionIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup execution interval on unmount
  useEffect(() => {
    return () => {
      if (executionIntervalRef.current) {
        clearInterval(executionIntervalRef.current);
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

  // T085: Track elapsed time during execution
  useEffect(() => {
    if (status === 'running' && executionStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - executionStartTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, executionStartTime]);

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
        setStatus('idle');
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
        setStatus('error');
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
      
      setStatus('idle');
      updateSnapshot();
    } catch (error: any) {
      setCompilationLog([{
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: `Compilation error: ${error.message || 'Unknown error'}`,
        level: 'error'
      }]);
      setStatus('error');
    }
  }, [parseResults, code, compiler]);

  // T081: Execute workout - advance runtime in loop
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

    if (status === 'running') {
      // Already running, ignore
      return;
    }

    setStatus('running');
    setExecutionStartTime(Date.now());
    updateSnapshot();

    // Log execution start
    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution started',
      level: 'info'
    }]);

    // Start execution loop - 10 steps/second (100ms per step)
    const executeStep = () => {
      try {
        if (!runtime) {
          // Runtime was cleared, stop execution
          if (executionIntervalRef.current) {
            clearInterval(executionIntervalRef.current);
            executionIntervalRef.current = null;
          }
          setStatus('idle');
          return;
        }

        // Advance runtime one step using NextEvent
        const nextEvent = new NextEvent({
          source: 'runtime-testbench-execute',
          timestamp: Date.now()
        });
        
        runtime.handle(nextEvent);
        
        // Update snapshot after each step
        updateSnapshot();

        // Check for completion (empty stack means workout complete)
        if (!runtime.stack.current) {
          if (executionIntervalRef.current) {
            clearInterval(executionIntervalRef.current);
            executionIntervalRef.current = null;
          }
          
          setStatus('completed');
          setCompilationLog(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            message: 'Workout completed',
            level: 'success'
          }]);
        }
      } catch (error: any) {
        // Stop execution on error
        if (executionIntervalRef.current) {
          clearInterval(executionIntervalRef.current);
          executionIntervalRef.current = null;
        }
        
        setStatus('error');
        setCompilationLog(prev => [...prev, {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: `Runtime error: ${error.message || 'Unknown error'}`,
          level: 'error'
        }]);
      }
    };

    // Execute first step immediately
    executeStep();
    
    // Then schedule subsequent steps at 100ms intervals (10 steps/second)
    executionIntervalRef.current = setInterval(executeStep, 100);
  }, [runtime]);

  // T082: Pause execution - stop loop and preserve state
  const handlePause = useCallback(() => {
    if (status !== 'running') {
      return;
    }

    // Stop execution loop
    if (executionIntervalRef.current) {
      clearInterval(executionIntervalRef.current);
      executionIntervalRef.current = null;
    }

    setStatus('paused');
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution paused',
      level: 'info'
    }]);
  }, [status]);

  // T082: Resume execution - continue from paused state
  const handleResume = useCallback(() => {
    if (status !== 'paused' || !runtime) {
      return;
    }

    setStatus('running');
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution resumed',
      level: 'info'
    }]);

    // Start execution loop again
    const executeStep = () => {
      try {
        if (!runtime || status === 'paused') {
          if (executionIntervalRef.current) {
            clearInterval(executionIntervalRef.current);
            executionIntervalRef.current = null;
          }
          return;
        }

        const nextEvent = new NextEvent({
          source: 'runtime-testbench-resume',
          timestamp: Date.now()
        });
        
        runtime.handle(nextEvent);
        updateSnapshot();

        if (!runtime.stack.current) {
          if (executionIntervalRef.current) {
            clearInterval(executionIntervalRef.current);
            executionIntervalRef.current = null;
          }
          
          setStatus('completed');
          setCompilationLog(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            message: 'Workout completed',
            level: 'success'
          }]);
        }
      } catch (error: any) {
        if (executionIntervalRef.current) {
          clearInterval(executionIntervalRef.current);
          executionIntervalRef.current = null;
        }
        
        setStatus('error');
        setCompilationLog(prev => [...prev, {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: `Runtime error: ${error.message || 'Unknown error'}`,
          level: 'error'
        }]);
      }
    };

    executeStep();
    executionIntervalRef.current = setInterval(executeStep, 100);
  }, [status, runtime]);

  // T083: Step-by-Step execution - advance one event only
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

    if (status === 'running') {
      // Can't step while running
      return;
    }

    try {
      // Advance runtime one step
      const nextEvent = new NextEvent({
        source: 'runtime-testbench-step',
        timestamp: Date.now()
      });
      
      runtime.handle(nextEvent);
      updateSnapshot();

      // Check for completion
      if (!runtime.stack.current) {
        setStatus('completed');
        setCompilationLog(prev => [...prev, {
          id: Date.now().toString(),
          timestamp: Date.now(),
          message: 'Workout completed',
          level: 'success'
        }]);
      } else {
        // Stay in paused state for next step
        setStatus('paused');
      }
    } catch (error: any) {
      setStatus('error');
      setCompilationLog(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        message: `Step error: ${error.message || 'Unknown error'}`,
        level: 'error'
      }]);
    }
  }, [runtime, status]);

  // T084: Stop execution - halt and stay in current state
  const handleStop = useCallback(() => {
    if (status === 'idle') {
      return;
    }

    // Stop execution loop if running
    if (executionIntervalRef.current) {
      clearInterval(executionIntervalRef.current);
      executionIntervalRef.current = null;
    }

    setStatus('idle');
    updateSnapshot();

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Execution stopped',
      level: 'info'
    }]);
  }, [status]);

  // T084: Reset execution - clear runtime and snapshot
  const handleReset = useCallback(() => {
    // Stop execution loop if running
    if (executionIntervalRef.current) {
      clearInterval(executionIntervalRef.current);
      executionIntervalRef.current = null;
    }

    // Clear runtime and snapshot
    setRuntime(null);
    setSnapshot(null);
    setStatus('idle');
    setElapsedTime(0);
    setExecutionStartTime(null);

    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: 'Runtime reset - ready for new compilation',
      level: 'info'
    }]);
  }, []);

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
    setMemoryHighlight,
    setLineHighlight,
    clearHighlight
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
              case 'execute': 
                if (status === 'paused') {
                  handleResume();
                } else {
                  handleExecute();
                }
                break;
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
            speed={1}
            stepMode={false}
            onPlayPause={handleExecute}
            onStop={handleStop}
            onReset={handleReset}
            onSpeedChange={() => {}}
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