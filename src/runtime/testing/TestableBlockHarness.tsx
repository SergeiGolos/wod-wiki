import React, { useState, useCallback, useMemo } from 'react';
import { TestableBlock, TestableBlockConfig, MethodCall } from './TestableBlock';
import { TestableRuntime, RuntimeSnapshot, SnapshotDiff, TestableRuntimeConfig } from './TestableRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { ScriptRuntime } from '../ScriptRuntime';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { SnapshotDiffViewer, SnapshotDiffSummary, ModifiedValuesViewer } from './components/SnapshotDiffViewer';

/**
 * Test scenario configuration
 */
export interface TestScenario {
  /** Unique ID for this scenario */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description of what this scenario tests */
  description: string;
  
  /** Phase being tested */
  phase: 'push' | 'next' | 'pop';
  
  /** Factory function to create the block under test */
  blockFactory: (runtime: IScriptRuntime) => IRuntimeBlock;
  
  /** Test ID to assign to the testable block wrapper */
  testBlockId?: string;
  
  /** Configuration for the testable block wrapper */
  blockConfig?: Omit<TestableBlockConfig, 'testId'>;
  
  /** Configuration for the testable runtime */
  runtimeConfig?: TestableRuntimeConfig;
  
  /** Expected outcomes for validation */
  expectations?: {
    memoryAllocations?: number;
    memoryReleases?: number;
    stackPushes?: number;
    stackPops?: number;
    actionsReturned?: number;
  };
}

/**
 * Result of executing a test scenario
 */
export interface ScenarioResult {
  scenario: TestScenario;
  success: boolean;
  
  /** Snapshots before and after the phase execution */
  beforeSnapshot: RuntimeSnapshot;
  afterSnapshot: RuntimeSnapshot;
  diff: SnapshotDiff;
  
  /** Recorded method calls on the block */
  methodCalls: MethodCall[];
  
  /** Actions returned by the phase method */
  actionsReturned: any[];
  
  /** Validation results */
  validation: {
    passed: boolean;
    failures: string[];
  };
  
  /** Execution timing */
  executionTimeMs: number;
  
  /** Any error that occurred */
  error?: Error;
}

/**
 * Props for TestableBlockHarness component
 */
export interface TestableBlockHarnessProps {
  /** Scenarios to display/execute */
  scenarios: TestScenario[];
  
  /** Callback when scenario is executed */
  onScenarioExecute?: (result: ScenarioResult) => void;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Show detailed diff view */
  showDetailedDiff?: boolean;
}

// Empty snapshot for error cases
const emptySnapshot: RuntimeSnapshot = {
  timestamp: 0,
  stack: { depth: 0, blockKeys: [] },
  memory: { entries: [], totalCount: 0 }
};

/**
 * TestableBlockHarness provides a visual interface for:
 * - Setting up test scenarios
 * - Executing individual lifecycle phases
 * - Visualizing before/after state changes
 * - Validating expected outcomes
 */
export const TestableBlockHarness: React.FC<TestableBlockHarnessProps> = ({
  scenarios,
  onScenarioExecute,
  className = '',
  showDetailedDiff = true
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    scenarios[0]?.id ?? ''
  );
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const selectedScenario = useMemo(
    () => scenarios.find(s => s.id === selectedScenarioId),
    [scenarios, selectedScenarioId]
  );
  
  // Compute initial state when scenario is selected (before execution)
  const initialState = useMemo(() => {
    if (!selectedScenario) return null;
    
    try {
      // Create base runtime
      const compiler = new JitCompiler();
      const script = new WodScript('', [], []);
      const baseRuntime = new ScriptRuntime(script, compiler);
      
      // Wrap in testable runtime with scenario config
      const testRuntime = new TestableRuntime(
        baseRuntime,
        selectedScenario.runtimeConfig
      );
      
      // Create the block under test
      const realBlock = selectedScenario.blockFactory(testRuntime);
      
      // Wrap in testable block with test ID
      const testableBlock = new TestableBlock(realBlock, {
        ...selectedScenario.blockConfig,
        testId: selectedScenario.testBlockId ?? `test-${selectedScenario.id}`
      });
      
      // For next and pop phases, we need to set up the state first
      if (selectedScenario.phase === 'next' || selectedScenario.phase === 'pop') {
        // Push and mount the block to simulate pre-condition
        testRuntime.stack.push(testableBlock);
        testableBlock.mount(testRuntime);
      }
      
      // Take snapshot of initial state
      const snapshot = testRuntime.snapshot(`Initial state for ${selectedScenario.phase}`);
      
      return {
        snapshot,
        blockKey: testableBlock.key.toString(),
        blockLabel: testableBlock.label
      };
    } catch (error) {
      return {
        snapshot: emptySnapshot,
        error: error as Error,
        blockKey: 'error',
        blockLabel: 'Error creating block'
      };
    }
  }, [selectedScenario]);
  
  const executeScenario = useCallback(async () => {
    if (!selectedScenario) return;
    
    setIsExecuting(true);
    const startTime = performance.now();
    
    try {
      // Create base runtime
      const compiler = new JitCompiler();
      const script = new WodScript('', [], []);
      const baseRuntime = new ScriptRuntime(script, compiler);
      
      // Wrap in testable runtime
      const testRuntime = new TestableRuntime(
        baseRuntime,
        selectedScenario.runtimeConfig
      );
      
      // Create the block under test
      const realBlock = selectedScenario.blockFactory(testRuntime);
      
      // Wrap in testable block with test ID
      const testableBlock = new TestableBlock(realBlock, {
        ...selectedScenario.blockConfig,
        testId: selectedScenario.testBlockId ?? `test-${selectedScenario.id}`
      });
      
      // Take before snapshot
      const beforeSnapshot = testRuntime.snapshot(`Before ${selectedScenario.phase}`);
      
      // Clear operations after initial setup
      testRuntime.clearOperations();
      
      // Execute the phase
      let actionsReturned: any[] = [];
      
      switch (selectedScenario.phase) {
        case 'push':
          // For push, we push the block then call mount
          testRuntime.stack.push(testableBlock);
          actionsReturned = testableBlock.mount(testRuntime);
          break;
          
        case 'next':
          // For next, ensure block is on stack first
          testRuntime.stack.push(testableBlock);
          testableBlock.mount(testRuntime);
          testRuntime.clearOperations(); // Clear setup operations
          actionsReturned = testableBlock.next(testRuntime);
          break;
          
        case 'pop':
          // For pop, push and mount first
          testRuntime.stack.push(testableBlock);
          testableBlock.mount(testRuntime);
          testRuntime.clearOperations(); // Clear setup operations
          actionsReturned = testableBlock.unmount(testRuntime);
          testRuntime.stack.pop();
          testableBlock.dispose(testRuntime);
          break;
      }
      
      // Take after snapshot
      const afterSnapshot = testRuntime.snapshot(`After ${selectedScenario.phase}`);
      
      // Calculate diff
      const diff = testRuntime.diff(beforeSnapshot, afterSnapshot);
      
      // Validate expectations
      const validation = validateExpectations(
        selectedScenario.expectations,
        diff,
        testableBlock.calls,
        actionsReturned
      );
      
      const scenarioResult: ScenarioResult = {
        scenario: selectedScenario,
        success: validation.passed,
        beforeSnapshot,
        afterSnapshot,
        diff,
        methodCalls: testableBlock.calls.slice(), // Convert readonly to mutable
        actionsReturned,
        validation,
        executionTimeMs: performance.now() - startTime
      };
      
      setResult(scenarioResult);
      onScenarioExecute?.(scenarioResult);
      
    } catch (error) {
      const emptyDiff: SnapshotDiff = {
        before: emptySnapshot,
        after: emptySnapshot,
        stack: { pushed: [], popped: [], depthChange: 0 },
        memory: { allocated: [], released: [], modified: [] }
      };
      
      const errorResult: ScenarioResult = {
        scenario: selectedScenario,
        success: false,
        beforeSnapshot: emptySnapshot,
        afterSnapshot: emptySnapshot,
        diff: emptyDiff,
        methodCalls: [],
        actionsReturned: [],
        validation: { passed: false, failures: [(error as Error).message] },
        executionTimeMs: performance.now() - startTime,
        error: error as Error
      };
      
      setResult(errorResult);
      onScenarioExecute?.(errorResult);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedScenario, onScenarioExecute]);
  
  // Group scenarios by phase for easier navigation
  const scenariosByPhase = useMemo(() => {
    const grouped: Record<string, TestScenario[]> = {
      push: [],
      next: [],
      pop: []
    };
    for (const s of scenarios) {
      grouped[s.phase].push(s);
    }
    return grouped;
  }, [scenarios]);
  
  return (
    <div className={`testable-block-harness p-4 ${className}`}>
      {/* Scenario Selector */}
      <div className="scenario-selector mb-4">
        <label className="block text-sm font-medium mb-2">Select Scenario:</label>
        <select
          value={selectedScenarioId}
          onChange={(e) => {
            setSelectedScenarioId(e.target.value);
            setResult(null);
          }}
          className="w-full p-2 border rounded bg-white"
        >
          {Object.entries(scenariosByPhase).map(([phase, phaseScenarios]) => (
            phaseScenarios.length > 0 && (
              <optgroup key={phase} label={`${phase.toUpperCase()} Phase`}>
                {phaseScenarios.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )
          ))}
        </select>
        
        {selectedScenario && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">{selectedScenario.description}</div>
            <div className="mt-1 text-xs text-gray-400">
              Phase: <span className="font-medium">{selectedScenario.phase.toUpperCase()}</span>
              {selectedScenario.testBlockId && (
                <span className="ml-2">| Test ID: <code>{selectedScenario.testBlockId}</code></span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Initial State Preview (before execution) */}
      {initialState && !result && (
        <div className="initial-state mb-4 border rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-3 py-2 border-b flex items-center justify-between">
            <h4 className="font-medium text-blue-800">
              📋 Initial State (Before {selectedScenario?.phase.toUpperCase()})
            </h4>
            <span className="text-xs text-blue-600 font-mono">
              {initialState.blockKey}
            </span>
          </div>
          
          {initialState.error ? (
            <div className="p-3 bg-red-50 text-red-700 text-sm">
              <span className="font-medium">Error creating block:</span> {initialState.error.message}
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Block Info */}
              <div className="text-sm">
                <span className="text-gray-500">Block:</span>{' '}
                <span className="font-mono text-blue-600">{initialState.blockLabel}</span>
              </div>
              
              {/* Stack State */}
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs font-medium text-gray-500 mb-1">Stack ({initialState.snapshot.stack.depth} blocks)</div>
                {initialState.snapshot.stack.depth === 0 ? (
                  <div className="text-sm text-gray-400 italic">Empty stack</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {initialState.snapshot.stack.blockKeys.map((key, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                        {key}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Memory State */}
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Memory ({initialState.snapshot.memory.totalCount} entries)
                </div>
                {initialState.snapshot.memory.entries.length === 0 ? (
                  <div className="text-sm text-gray-400 italic">No memory allocations</div>
                ) : (
                  <div className="space-y-1">
                    {initialState.snapshot.memory.entries.map((entry, i) => (
                      <div key={i} className="text-xs font-mono flex items-center gap-2">
                        <span className="text-purple-600">{entry.type}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-600 truncate max-w-[200px]">
                          {JSON.stringify(entry.value)}
                        </span>
                        <span className="text-gray-400 text-[10px]">({entry.ownerId})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Phase hint */}
              <div className="text-xs text-gray-400 italic border-t pt-2">
                {selectedScenario?.phase === 'push' && 
                  'Click Execute to push the block to the stack and call mount()'}
                {selectedScenario?.phase === 'next' && 
                  'Block is already mounted. Click Execute to call next() and see state changes.'}
                {selectedScenario?.phase === 'pop' && 
                  'Block is already mounted. Click Execute to call unmount(), pop, and dispose().'}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Execute Button */}
      <button
        onClick={executeScenario}
        disabled={isExecuting || !selectedScenario}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
      >
        {isExecuting ? 'Executing...' : `Execute ${selectedScenario?.phase.toUpperCase() ?? 'Scenario'}`}
      </button>
      
      {/* Results Display */}
      {result && (
        <div className="results mt-6 space-y-4">
          {/* Status Banner */}
          <div className={`p-3 rounded flex items-center justify-between ${
            result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <span className="font-bold">
              {result.success ? '✅ PASSED' : '❌ FAILED'}
            </span>
            <span className="text-sm opacity-75">
              {result.executionTimeMs.toFixed(2)}ms
            </span>
          </div>
          
          {/* Error Display */}
          {result.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <h4 className="font-medium text-red-700 mb-1">Error</h4>
              <pre className="text-xs text-red-600 overflow-x-auto">
                {result.error.message}
              </pre>
            </div>
          )}
          
          {/* Diff Summary */}
          <div className="bg-gray-50 p-3 rounded">
            <SnapshotDiffSummary diff={result.diff} />
          </div>
          
          {/* Detailed Diff View */}
          {showDetailedDiff && (
            <div className="border rounded p-3">
              <h4 className="font-medium mb-3">State Comparison</h4>
              <SnapshotDiffViewer diff={result.diff} />
            </div>
          )}
          
          {/* Modified Values */}
          {result.diff.memory.modified.length > 0 && (
            <div className="border rounded p-3">
              <ModifiedValuesViewer modified={result.diff.memory.modified} />
            </div>
          )}
          
          {/* Method Calls */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-2">Method Calls ({result.methodCalls.length})</h4>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
              {result.methodCalls.length === 0 ? (
                <span className="text-gray-500 italic">No method calls recorded</span>
              ) : (
                result.methodCalls.map((call, i) => (
                  <div key={i} className="py-1 border-b border-gray-200 last:border-0">
                    <span className="text-blue-600">{call.method}()</span>
                    <span className="text-gray-500 ml-2">
                      {call.duration.toFixed(2)}ms
                    </span>
                    {call.error && (
                      <span className="text-red-600 ml-2">
                        ⚠️ {call.error.message}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Actions Returned */}
          <div className="border rounded p-3">
            <h4 className="font-medium mb-2">Actions Returned ({result.actionsReturned.length})</h4>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
              {result.actionsReturned.length === 0 ? (
                <span className="text-gray-500 italic">No actions returned</span>
              ) : (
                result.actionsReturned.map((action, i) => (
                  <div key={i} className="py-1">
                    <span className="text-purple-600">
                      {action.type ?? action.constructor?.name ?? 'Unknown Action'}
                    </span>
                    {action.target && (
                      <span className="text-gray-500 ml-2">→ {action.target}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Validation Failures */}
          {!result.validation.passed && result.validation.failures.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <h4 className="font-medium mb-2 text-red-700">Validation Failures</h4>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {result.validation.failures.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Validation helper
function validateExpectations(
  expectations: TestScenario['expectations'],
  diff: SnapshotDiff,
  _calls: ReadonlyArray<MethodCall>,
  actions: any[]
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  
  if (!expectations) {
    return { passed: true, failures: [] };
  }
  
  if (expectations.memoryAllocations !== undefined) {
    if (diff.memory.allocated.length !== expectations.memoryAllocations) {
      failures.push(
        `Expected ${expectations.memoryAllocations} memory allocations, got ${diff.memory.allocated.length}`
      );
    }
  }
  
  if (expectations.memoryReleases !== undefined) {
    if (diff.memory.released.length !== expectations.memoryReleases) {
      failures.push(
        `Expected ${expectations.memoryReleases} memory releases, got ${diff.memory.released.length}`
      );
    }
  }
  
  if (expectations.stackPushes !== undefined) {
    if (diff.stack.pushed.length !== expectations.stackPushes) {
      failures.push(
        `Expected ${expectations.stackPushes} stack pushes, got ${diff.stack.pushed.length}`
      );
    }
  }
  
  if (expectations.stackPops !== undefined) {
    if (diff.stack.popped.length !== expectations.stackPops) {
      failures.push(
        `Expected ${expectations.stackPops} stack pops, got ${diff.stack.popped.length}`
      );
    }
  }
  
  if (expectations.actionsReturned !== undefined) {
    if (actions.length !== expectations.actionsReturned) {
      failures.push(
        `Expected ${expectations.actionsReturned} actions returned, got ${actions.length}`
      );
    }
  }
  
  return {
    passed: failures.length === 0,
    failures
  };
}

export default TestableBlockHarness;
