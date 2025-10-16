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
  const [errors] = useState([]); // TODO: Connect to parser
  const [compilationLog] = useState([]); // TODO: Connect to compiler

  // Debounce timer ref
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Mock action handlers
  const handleCompile = () => {
    setStatus('idle');
    if (runtime) updateSnapshot();
  };
  const handleExecute = () => {
    setStatus('running');
    if (runtime) updateSnapshot();
  };
  const handlePause = () => {
    setStatus('paused');
    if (runtime) updateSnapshot();
  };
  const handleStop = () => {
    setStatus('idle');
    if (runtime) updateSnapshot();
  };
  const handleReset = () => {
    setStatus('idle');
    if (runtime) updateSnapshot();
  };
  const handleStep = () => {
    setStatus('running');
    if (runtime) updateSnapshot();
  };

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
        return 'bg-background text-foreground min-h-screen p-6 space-y-6';
      case 'tablet':
        return 'bg-background text-foreground min-h-screen p-4 space-y-4';
      case 'mobile':
        return 'bg-background text-foreground min-h-screen p-2 space-y-2';
      default:
        return 'bg-background text-foreground min-h-screen p-6 space-y-6';
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
            { id: 'execute', label: 'Run', icon: '▶️', disabled: status === 'running' },
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
          {/* Editor Panel */}
          <div className="bg-card border rounded-lg p-4">
            <EditorPanel
          value={code}
          onChange={handleCodeChange}
          highlightedLine={highlightState.line}
          errors={errors}
          status={status === 'idle' ? 'idle' : status === 'error' ? 'error' : 'parsing'}
          readonly={false}
            />
          </div>

          {/* Compilation Panel */}
          <div className="bg-card border rounded-lg p-4">
            <CompilationPanel
          activeTab="output"
          onTabChange={() => {}}
          compilationLog={compilationLog}
          errors={errors}
          warnings={[]}
            />
          </div>

          {/* Runtime Stack Panel */}
          <div className="bg-card border rounded-lg p-4">
            <RuntimeStackPanel
          blocks={blocks}
          highlightedBlockKey={highlightState.blockKey}
          onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
          onBlockClick={() => {}} // TODO: Implement block selection
            />
          </div>

          {/* Memory Panel */}
          <div className="bg-card border rounded-lg p-4">
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
        <div className="bg-card border rounded-lg p-4">
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
        <div className="bg-card border rounded-lg p-4">
          <StatusFooter
          status={status as any}
          elapsedTime={0}
          blockCount={blocks.length}
        />
        </div>
      </div>
    </div>
  );
};

export default RuntimeTestBench;