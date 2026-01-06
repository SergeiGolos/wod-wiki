/**
 * QueueTestHarness
 * 
 * A queue-based testing component that uses TestableRuntime to execute
 * test scenarios step-by-step or all at once.
 * 
 * Features:
 * - Parse WOD script and select statements by line index
 * - Build a queue of actions (push blocks, simulate events, apply modifications)
 * - Execute queue step-by-step or all at once
 * - Visualize stack/memory state after each step
 * - 3 default templates for testing common behaviors
 * - UNIFIED VIEW: Integrates with StackedClockDisplay for live workout visualization
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TestableRuntime, RuntimeSnapshot, SnapshotDiff } from '@/testing/testable';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { RuntimeMemory } from '@/runtime/RuntimeMemory';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { RuntimeClock } from '@/runtime/RuntimeClock';
import { EventBus } from '@/runtime/events/EventBus';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { WodScript, IScript } from '@/parser/WodScript';
import { MdTimerRuntime } from '@/parser/md-timer';
import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { HistoryStrategy } from '@/runtime/compiler/strategies/enhancements/HistoryStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { SnapshotDiffViewer, SnapshotDiffSummary } from './SnapshotDiffViewer';
import { RuntimeProvider } from '@/runtime/context/RuntimeContext';
import { StackedClockDisplay } from '@/clock/components/StackedClockDisplay';

// ==================== Types ====================

/**
 * A single action in the test queue
 */
export interface QueueAction {
  id: string;
  type: 'push' | 'mount' | 'next' | 'unmount' | 'pop' | 'tick' | 'simulate-next' | 'simulate-reps' | 'custom';
  label: string;
  description?: string;
  params?: Record<string, unknown>;
  /** For push actions - the statement line index (0-based) */
  statementIndex?: number;
  /** Include children when pushing */
  includeChildren?: boolean;
  /** Status after execution */
  status?: 'pending' | 'running' | 'completed' | 'error';
  /** Snapshot taken after this action */
  snapshot?: RuntimeSnapshot;
  /** Error if execution failed */
  error?: Error;
}

/**
 * Test template definition
 */
export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  wodScript: string;
  queue: Omit<QueueAction, 'id' | 'status' | 'snapshot'>[];
}

/**
 * Props for QueueTestHarness
 */
export interface QueueTestHarnessProps {
  /** Initial WOD script */
  initialScript?: string;
  /** Initial template to load */
  initialTemplate?: TestTemplate;
  /** Custom templates in addition to defaults */
  customTemplates?: TestTemplate[];
  /** Callback when execution completes */
  onExecutionComplete?: (snapshots: RuntimeSnapshot[], diffs: SnapshotDiff[]) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show the unified runtime view (StackedClockDisplay) */
  showRuntimeView?: boolean;
  /** Layout mode: 'horizontal' splits left/right, 'vertical' stacks top/bottom */
  layout?: 'horizontal' | 'vertical';
}

// ==================== Default Templates ====================

const DEFAULT_TEMPLATES: TestTemplate[] = [
  {
    id: 'effort-completion',
    name: 'Effort Completion',
    description: 'Test EffortBlock completion behavior when reps reach target',
    wodScript: '5 Pullups',
    queue: [
      { type: 'push', label: 'Push Effort Block', statementIndex: 0 },
      { type: 'mount', label: 'Mount Block' },
      { type: 'simulate-reps', label: 'Simulate 3 Reps', params: { reps: 3 } },
      { type: 'next', label: 'Call next() (should continue)' },
      { type: 'simulate-reps', label: 'Simulate 2 More Reps', params: { reps: 5 } },
      { type: 'next', label: 'Call next() (should complete)' },
    ]
  },
  {
    id: 'timer-expiration',
    name: 'Timer Expiration',
    description: 'Test TimerBlock completion when time expires',
    wodScript: `5:00 For Time
  Run 400m`,
    queue: [
      { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Mount Block' },
      { type: 'tick', label: 'Tick (50%)', description: 'Simulate timer at 50%' },
      { type: 'next', label: 'Call next() (should continue)' },
      { type: 'tick', label: 'Tick (100%)', description: 'Simulate timer expired' },
      { type: 'next', label: 'Call next() (should complete)' },
    ]
  },
  {
    id: 'rounds-iteration',
    name: 'Rounds Iteration',
    description: 'Test RoundsBlock iteration through multiple rounds',
    wodScript: `3 Rounds
  10 Pushups
  15 Squats`,
    queue: [
      { type: 'push', label: 'Push Rounds Block', statementIndex: 0, includeChildren: true },
      { type: 'mount', label: 'Mount Block (Round 1)' },
      { type: 'next', label: 'Complete Round 1 children' },
      { type: 'next', label: 'Advance to Round 2' },
      { type: 'next', label: 'Complete Round 2 children' },
      { type: 'next', label: 'Advance to Round 3' },
      { type: 'next', label: 'Complete Round 3 children' },
      { type: 'next', label: 'Call next() (should complete)' },
    ]
  }
];

// ==================== Utilities ====================

function createStandardCompiler(): JitCompiler {
  const compiler = new JitCompiler();

  // Logic
  compiler.registerStrategy(new AmrapLogicStrategy());
  compiler.registerStrategy(new IntervalLogicStrategy());

  // Components
  compiler.registerStrategy(new GenericTimerStrategy());
  compiler.registerStrategy(new GenericLoopStrategy());
  compiler.registerStrategy(new GenericGroupStrategy());

  // Enhancements
  compiler.registerStrategy(new SoundStrategy());
  compiler.registerStrategy(new HistoryStrategy());
  compiler.registerStrategy(new ChildrenStrategy());

  // Fallback
  compiler.registerStrategy(new EffortFallbackStrategy());

  return compiler;
}

function parseScript(source: string): IScript | null {
  if (!source.trim()) return null;
  try {
    const parser = new MdTimerRuntime();
    return parser.read(source);
  } catch (e) {
    console.error('Parse error:', e);
    return null;
  }
}

function generateId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== Component ====================

export const QueueTestHarness: React.FC<QueueTestHarnessProps> = ({
  initialScript = '5 Pullups',
  initialTemplate,
  customTemplates = [],
  onExecutionComplete,
  className = '',
  showRuntimeView = false,
  layout = 'horizontal'
}) => {
  // Script state
  const [wodScript, setWodScript] = useState(initialTemplate?.wodScript ?? initialScript);
  const [parsedScript, setParsedScript] = useState<IScript | null>(null);

  // Queue state
  const [queue, setQueue] = useState<QueueAction[]>(() =>
    initialTemplate?.queue.map(q => ({ ...q, id: generateId(), status: 'pending' as const })) ?? []
  );
  const [currentStep, setCurrentStep] = useState(-1);

  // Runtime state
  const [testRuntime, setTestRuntime] = useState<TestableRuntime | null>(null);
  const [currentBlock, setCurrentBlock] = useState<IRuntimeBlock | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<Error | null>(null);

  // Snapshots for diff display
  const [snapshots, setSnapshots] = useState<RuntimeSnapshot[]>([]);
  const [selectedDiffIndices, setSelectedDiffIndices] = useState<[number, number] | null>(null);

  // All available templates
  const allTemplates = useMemo(() =>
    [...DEFAULT_TEMPLATES, ...customTemplates],
    [customTemplates]
  );

  // Parse script when it changes
  useEffect(() => {
    const script = parseScript(wodScript);
    setParsedScript(script);
  }, [wodScript]);

  // Parsed statements for display
  const statements = useMemo(() => {
    if (!parsedScript) return [];
    return parsedScript.statements.map((stmt, index) => ({
      index,
      id: stmt.id,
      text: (stmt as any).sourceText || (stmt.meta as any).raw || `Statement ${index}`,
      fragments: stmt.fragments?.map(f => f.fragmentType).join(', ') || 'unknown'
    }));
  }, [parsedScript]);

  // Reset runtime for new execution
  const resetRuntime = useCallback(() => {
    const compiler = createStandardCompiler();
    const emptyScript = new WodScript('', [], []);

    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };

    const baseRuntime = new ScriptRuntime(emptyScript, compiler, dependencies);
    const newTestRuntime = new TestableRuntime(baseRuntime);

    setTestRuntime(newTestRuntime);
    setCurrentBlock(null);
    setCurrentStep(-1);
    setExecutionError(null);
    setSnapshots([]);
    setSelectedDiffIndices(null);

    // Reset queue status
    setQueue(prev => prev.map(action => ({
      ...action,
      status: 'pending',
      snapshot: undefined,
      error: undefined
    })));

    // Take initial snapshot
    const initialSnapshot = newTestRuntime.snapshot('Initial State');
    setSnapshots([initialSnapshot]);

    return newTestRuntime;
  }, []);

  // Execute a single queue action
  const executeAction = useCallback(async (
    action: QueueAction,
    runtime: TestableRuntime,
    script: IScript | null,
    block: IRuntimeBlock | null
  ): Promise<{ block: IRuntimeBlock | null; error?: Error }> => {
    try {
      let resultBlock = block;

      switch (action.type) {
        case 'push': {
          if (!script || action.statementIndex === undefined) {
            throw new Error('No script or statement index for push action');
          }
          const newBlock = runtime.pushStatementByIndex(
            script,
            action.statementIndex,
            { includeChildren: action.includeChildren ?? false, mountAfterPush: false }
          );
          if (!newBlock) {
            throw new Error(`Failed to push statement at index ${action.statementIndex}`);
          }
          resultBlock = newBlock;
          break;
        }

        case 'mount': {
          if (!block) throw new Error('No block to mount');
          const actions = block.mount(runtime);
          for (const a of actions) {
            if (a && typeof a.do === 'function') a.do(runtime);
          }
          break;
        }

        case 'next': {
          if (!block) throw new Error('No block for next');
          const actions = block.next(runtime);
          for (const a of actions) {
            if (a && typeof a.do === 'function') a.do(runtime);
          }
          break;
        }

        case 'unmount': {
          if (!block) throw new Error('No block to unmount');
          const actions = block.unmount(runtime);
          for (const a of actions) {
            if (a && typeof a.do === 'function') a.do(runtime);
          }
          break;
        }

        case 'pop': {
          runtime.stack.pop();
          resultBlock = runtime.stack.current ?? null;
          break;
        }

        case 'tick': {
          runtime.simulateTick();
          break;
        }

        case 'simulate-next': {
          runtime.simulateNext();
          break;
        }

        case 'simulate-reps': {
          const reps = (action.params?.reps as number) ?? 1;
          const blockId = block?.key.toString() ?? 'unknown';
          runtime.simulateReps(blockId, reps);
          break;
        }

        case 'custom': {
          // Custom actions can be extended by consumers
          console.log('Custom action:', action.params);
          break;
        }
      }

      return { block: resultBlock };
    } catch (error) {
      return { block, error: error as Error };
    }
  }, []);

  // Execute next step in queue
  const executeNextStep = useCallback(async () => {
    const nextIndex = currentStep + 1;
    if (nextIndex >= queue.length) return;

    let runtime = testRuntime;
    if (!runtime) {
      runtime = resetRuntime();
    }

    setIsExecuting(true);

    // Mark action as running
    setQueue(prev => prev.map((action, i) =>
      i === nextIndex ? { ...action, status: 'running' } : action
    ));

    const action = queue[nextIndex];
    const { block: resultBlock, error } = await executeAction(
      action,
      runtime,
      parsedScript,
      currentBlock
    );

    // Take snapshot after action
    const snapshot = runtime.snapshot(`After: ${action.label}`);
    setSnapshots(prev => [...prev, snapshot]);

    // Update action status
    setQueue(prev => prev.map((a, i) =>
      i === nextIndex
        ? { ...a, status: error ? 'error' : 'completed', snapshot, error }
        : a
    ));

    setCurrentBlock(resultBlock);
    setCurrentStep(nextIndex);
    setIsExecuting(false);

    if (error) {
      setExecutionError(error);
    }
  }, [currentStep, queue, testRuntime, parsedScript, currentBlock, executeAction, resetRuntime]);

  // Execute all remaining steps
  const executeAll = useCallback(async () => {
    let runtime = testRuntime;
    if (!runtime || currentStep === -1) {
      runtime = resetRuntime();
    }

    setIsExecuting(true);
    let block = currentBlock;
    const newSnapshots: RuntimeSnapshot[] = [];

    for (let i = currentStep + 1; i < queue.length; i++) {
      // Mark action as running
      setQueue(prev => prev.map((action, idx) =>
        idx === i ? { ...action, status: 'running' } : action
      ));

      const action = queue[i];
      const { block: resultBlock, error } = await executeAction(
        action,
        runtime,
        parsedScript,
        block
      );

      // Take snapshot
      const snapshot = runtime.snapshot(`After: ${action.label}`);
      newSnapshots.push(snapshot);

      // Update action status
      setQueue(prev => prev.map((a, idx) =>
        idx === i
          ? { ...a, status: error ? 'error' : 'completed', snapshot, error }
          : a
      ));

      block = resultBlock;
      setCurrentStep(i);

      if (error) {
        setExecutionError(error);
        setIsExecuting(false);
        setCurrentBlock(block);
        return;
      }

      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setSnapshots(prev => [...prev, ...newSnapshots]);
    setCurrentBlock(block);
    setIsExecuting(false);

    // Calculate diffs and call callback
    if (onExecutionComplete) {
      const allSnapshots = [...snapshots, ...newSnapshots];
      const diffs: SnapshotDiff[] = [];
      for (let i = 1; i < allSnapshots.length; i++) {
        diffs.push(runtime.diff(allSnapshots[i - 1], allSnapshots[i]));
      }
      onExecutionComplete(allSnapshots, diffs);
    }
  }, [currentStep, queue, testRuntime, parsedScript, currentBlock, executeAction, resetRuntime, snapshots, onExecutionComplete]);

  // Reset everything
  const handleReset = useCallback(() => {
    resetRuntime();
  }, [resetRuntime]);

  // Load template
  const loadTemplate = useCallback((template: TestTemplate) => {
    setWodScript(template.wodScript);
    setQueue(template.queue.map(q => ({
      ...q,
      id: generateId(),
      status: 'pending' as const
    })));
    setCurrentStep(-1);
    setSnapshots([]);
    setTestRuntime(null);
    setCurrentBlock(null);
    setExecutionError(null);
  }, []);

  // Add action to queue
  const addAction = useCallback((type: QueueAction['type'], params?: Partial<QueueAction>) => {
    const newAction: QueueAction = {
      id: generateId(),
      type,
      label: params?.label ?? type.charAt(0).toUpperCase() + type.slice(1),
      description: params?.description,
      params: params?.params,
      statementIndex: params?.statementIndex,
      includeChildren: params?.includeChildren,
      status: 'pending'
    };
    setQueue(prev => [...prev, newAction]);
  }, []);

  // Remove action from queue
  const removeAction = useCallback((id: string) => {
    setQueue(prev => prev.filter(a => a.id !== id));
  }, []);

  // Calculate current diff for display
  const currentDiff = useMemo(() => {
    if (!testRuntime || snapshots.length < 2) return null;
    if (selectedDiffIndices) {
      const [before, after] = selectedDiffIndices;
      if (before < snapshots.length && after < snapshots.length) {
        return testRuntime.diff(snapshots[before], snapshots[after]);
      }
    }
    return testRuntime.diff(snapshots[snapshots.length - 2], snapshots[snapshots.length - 1]);
  }, [testRuntime, snapshots, selectedDiffIndices]);

  // Get the underlying runtime for the runtime view
  const underlyingRuntime = useMemo(() => {
    return testRuntime?.wrapped ?? null;
  }, [testRuntime]);

  // Handle runtime events from StackedClockDisplay
  const handleRuntimeButtonClick = useCallback((eventName: string, payload?: Record<string, unknown>) => {
    if (!testRuntime) return;
    console.log(`🎮 QueueTestHarness: Runtime button click - ${eventName}`, payload);
    testRuntime.handle({
      name: eventName,
      timestamp: new Date(),
      data: payload || {},
    });
  }, [testRuntime]);

  // Build the test controls panel (left side or top)
  const TestControlsPanel = () => (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium mb-2">Templates</label>
        <div className="flex flex-wrap gap-2">
          {allTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => loadTemplate(template)}
              className="px-3 py-2 text-sm bg-white border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Script & Statement Selection */}
        <div className="space-y-4">
          {/* WOD Script Editor */}
          <div>
            <label className="block text-sm font-medium mb-2">WOD Script</label>
            <textarea
              value={wodScript}
              onChange={(e) => setWodScript(e.target.value)}
              className="w-full h-32 font-mono text-sm p-3 border rounded bg-gray-900 text-gray-100"
              placeholder="Enter WOD script..."
            />
          </div>

          {/* Parsed Statements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Parsed Statements
              <span className="text-gray-500 font-normal ml-2">(click to add push action)</span>
            </label>
            <div className="border rounded p-2 bg-white max-h-48 overflow-y-auto">
              {statements.length > 0 ? (
                <div className="space-y-1">
                  {statements.map(stmt => (
                    <button
                      key={stmt.id}
                      onClick={() => addAction('push', {
                        label: `Push: ${stmt.text.substring(0, 30)}...`,
                        statementIndex: stmt.index
                      })}
                      className="w-full text-left p-2 text-sm hover:bg-blue-50 rounded transition-colors"
                    >
                      <span className="text-gray-500">[{stmt.index}]</span>
                      <span className="ml-2 font-mono">{stmt.text}</span>
                      <span className="ml-2 text-xs text-gray-400">({stmt.fragments})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 italic p-2">No valid statements</div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Add Action</label>
            <div className="flex flex-wrap gap-2">
              {(['mount', 'next', 'unmount', 'pop', 'tick', 'simulate-next'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => addAction(type, { label: type.charAt(0).toUpperCase() + type.slice(1) })}
                  className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Execution Queue */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Execution Queue ({queue.length})</label>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Reset
              </button>
              <button
                onClick={executeNextStep}
                disabled={isExecuting || currentStep >= queue.length - 1}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Step
              </button>
              <button
                onClick={executeAll}
                disabled={isExecuting || currentStep >= queue.length - 1}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Run All
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="border rounded p-2 bg-white max-h-72 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="text-gray-400 italic p-2">
                No actions in queue. Click a statement or add an action.
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((action, index) => (
                  <div
                    key={action.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${action.status === 'completed' ? 'bg-green-50 border border-green-200' :
                      action.status === 'running' ? 'bg-blue-50 border border-blue-200' :
                        action.status === 'error' ? 'bg-red-50 border border-red-200' :
                          index === currentStep + 1 ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-6">{index + 1}</span>
                      <span className={`font-medium ${action.status === 'completed' ? 'text-green-700' :
                        action.status === 'error' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                        {action.status === 'completed' && '✓ '}
                        {action.status === 'error' && '✗ '}
                        {action.status === 'running' && '⟳ '}
                        {action.label}
                      </span>
                      {action.statementIndex !== undefined && (
                        <span className="text-xs text-purple-500">[line {action.statementIndex}]</span>
                      )}
                    </div>
                    {action.status === 'pending' && (
                      <button
                        onClick={() => removeAction(action.id)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {executionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
              <div className="font-medium">Error</div>
              <div className="text-sm">{executionError.message}</div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {snapshots.length > 1 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold">Execution Results</h3>

          {/* Snapshot Timeline */}
          <div className="p-3 bg-gray-50 rounded">
            <label className="block text-sm font-medium mb-2">Snapshot Timeline</label>
            <div className="flex flex-wrap gap-2">
              {snapshots.map((snap, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (index > 0) {
                      setSelectedDiffIndices([index - 1, index]);
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded ${selectedDiffIndices?.[1] === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border hover:bg-blue-50'
                    }`}
                >
                  {snap.label || `Snapshot ${index}`}
                </button>
              ))}
            </div>
          </div>

          {/* Diff Display */}
          {currentDiff && (
            <div className="border rounded p-3">
              <SnapshotDiffSummary diff={currentDiff} />
              <div className="mt-4">
                <SnapshotDiffViewer diff={currentDiff} />
              </div>
            </div>
          )}

          {/* Current State */}
          <div className="p-3 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Current State</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Stack Depth:</span>
                <span className="ml-2 font-mono">
                  {snapshots[snapshots.length - 1]?.stack.depth ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Memory Entries:</span>
                <span className="ml-2 font-mono">
                  {snapshots[snapshots.length - 1]?.memory.totalCount ?? 0}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Current Block:</span>
                <span className="ml-2 font-mono">
                  {snapshots[snapshots.length - 1]?.stack.currentBlockKey ?? 'none'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Build the runtime view panel (right side or bottom)
  const RuntimeViewPanel = () => (
    <div className="p-4 bg-slate-900 rounded-lg min-h-[400px]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">🏋️ Workout Output</h3>
        <div className="flex items-center gap-2">
          {testRuntime && (
            <span className="text-xs text-slate-400">
              Runtime: {underlyingRuntime ? 'Connected' : 'Not connected'}
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${testRuntime ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>
      </div>

      {underlyingRuntime ? (
        <RuntimeProvider runtime={underlyingRuntime}>
          <StackedClockDisplay
            className="w-full"
            showStackDebug={true}
            onButtonClick={handleRuntimeButtonClick}
          />
        </RuntimeProvider>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <div className="text-6xl mb-4">🏃</div>
          <p className="text-center">
            No active runtime.<br />
            <span className="text-sm">Click &quot;Step&quot; or &quot;Run All&quot; to start executing the test queue.</span>
          </p>
        </div>
      )}
    </div>
  );

  // Render based on layout and showRuntimeView
  if (!showRuntimeView) {
    // Original behavior - just test controls
    return (
      <div className={`queue-test-harness ${className}`}>
        <TestControlsPanel />
      </div>
    );
  }

  // Unified view with runtime visualization
  if (layout === 'vertical') {
    return (
      <div className={`queue-test-harness ${className}`}>
        <TestControlsPanel />
        <div className="mt-6">
          <RuntimeViewPanel />
        </div>
      </div>
    );
  }

  // Default: horizontal layout
  return (
    <div className={`queue-test-harness flex gap-6 ${className}`}>
      <div className="flex-1 min-w-0">
        <TestControlsPanel />
      </div>
      <div className="w-[450px] flex-shrink-0">
        <RuntimeViewPanel />
      </div>
    </div>
  );
};

export default QueueTestHarness;
