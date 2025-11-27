# Testable Block Architecture - Deep Dive

## Executive Summary

This document outlines the design for a **TestableBlock** wrapper system that enables fine-grained testing and visualization of how individual `IRuntimeBlock` implementations interact with the runtime's memory and stack systems during each lifecycle phase (push, next, pop).

### Goals
1. **Visualize** memory and stack changes caused by each block operation
2. **Intercept** all block methods with configurable spy/override behavior  
3. **Pre-configure** runtime state for complex testing scenarios
4. **Create** repeatable, isolated test stories in Storybook

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Storybook Stories                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Push Stories │  │ Next Stories │  │ Pop Stories  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TestableBlockHarness                             │
│  - Pre-configures runtime state                                     │
│  - Wraps blocks in TestableBlock                                    │
│  - Captures before/after snapshots                                  │
│  - Provides visual diff of changes                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TestableBlock<T>                               │
│  - Wraps any IRuntimeBlock implementation                           │
│  - Intercepts: mount(), next(), unmount(), dispose()                │
│  - Records: method calls, arguments, return values                  │
│  - Supports: override, ignore, spy modes                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TestableRuntime                                │
│  - Wraps IScriptRuntime                                             │
│  - Tracks all memory operations                                     │
│  - Tracks all stack operations                                      │
│  - Captures snapshots at any point                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. TestableBlock

A proxy wrapper that intercepts all `IRuntimeBlock` methods while delegating to the underlying implementation. Supports custom test IDs for easy identification in visualizations.

```typescript
// src/runtime/testing/TestableBlock.ts

import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from '../IRuntimeAction';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Configuration for method interception behavior
 */
export type InterceptMode = 
  | 'passthrough'  // Call underlying method normally
  | 'spy'          // Call method and record arguments/return
  | 'override'     // Replace with custom implementation
  | 'ignore';      // Skip method call entirely

/**
 * Configuration for TestableBlock behavior
 */
export interface TestableBlockConfig {
  /** Custom ID for easy identification in visualizations */
  testId?: string;
  
  /** Custom label override for display purposes */
  labelOverride?: string;
  
  /** Mode for mount() interception */
  mountMode?: InterceptMode;
  /** Custom mount implementation when mode is 'override' */
  mountOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for next() interception */
  nextMode?: InterceptMode;
  /** Custom next implementation when mode is 'override' */
  nextOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for unmount() interception */
  unmountMode?: InterceptMode;
  /** Custom unmount implementation when mode is 'override' */
  unmountOverride?: (runtime: IScriptRuntime) => IRuntimeAction[];
  
  /** Mode for dispose() interception */
  disposeMode?: InterceptMode;
  /** Custom dispose implementation when mode is 'override' */
  disposeOverride?: (runtime: IScriptRuntime) => void;
}

/**
 * TestableBlock wraps any IRuntimeBlock to enable:
 * - Method interception (spy, override, ignore)
 * - Call recording for assertions
 * - Custom test IDs for easy identification
 * 
 * @example
 * ```typescript
 * const realBlock = new EffortBlock(runtime, [1], { exerciseName: 'Squats', targetReps: 10 });
 * const testable = new TestableBlock(realBlock, {
 *   testId: 'effort-squats-1',  // Easy to identify in visualizations
 *   nextMode: 'spy',
 *   mountOverride: () => [] // Skip default mount actions
 * });
 * 
 * // Execute and inspect
 * testable.mount(runtime);
 * console.log(testable.calls); // All recorded method calls
 * console.log(testable.key.toString()); // 'effort-squats-1'
 * ```
 */
export class TestableBlock implements IRuntimeBlock {
  private _calls: MethodCall[] = [];
  private _config: Required<TestableBlockConfig>;
  private _testKey: BlockKey;
  
  constructor(
    private readonly _wrapped: IRuntimeBlock,
    config: TestableBlockConfig = {}
  ) {
    // Apply defaults
    this._config = {
      testId: config.testId ?? '',
      labelOverride: config.labelOverride ?? '',
      mountMode: config.mountMode ?? 'spy',
      mountOverride: config.mountOverride ?? (() => []),
      nextMode: config.nextMode ?? 'spy',
      nextOverride: config.nextOverride ?? (() => []),
      unmountMode: config.unmountMode ?? 'spy',
      unmountOverride: config.unmountOverride ?? (() => []),
      disposeMode: config.disposeMode ?? 'spy',
      disposeOverride: config.disposeOverride ?? (() => {}),
    };
    
    // Create custom key if testId provided, otherwise use wrapped key
    this._testKey = this._config.testId 
      ? new TestableBlockKey(this._config.testId)
      : this._wrapped.key;
  }
  
  // ========== IRuntimeBlock Properties ==========
  
  get key(): BlockKey {
    return this._testKey;
  }
  
  get sourceIds(): number[] {
    return this._wrapped.sourceIds;
  }
  
  get blockType(): string | undefined {
    return this._wrapped.blockType;
  }
  
  get label(): string {
    return this._config.labelOverride || this._wrapped.label;
  }
  
  // ========== Testing API ==========
  
  /** Access the underlying block for direct inspection */
  get wrapped(): IRuntimeBlock {
    return this._wrapped;
  }
  
  /** The test ID assigned to this block */
  get testId(): string {
    return this._config.testId;
  }
  
  /** All recorded method calls */
  get calls(): ReadonlyArray<MethodCall> {
    return [...this._calls];
  }
  
  /** Get calls for a specific method */
  getCallsFor(method: keyof IRuntimeBlock): MethodCall[] {
    return this._calls.filter(c => c.method === method);
  }
  
  /** Check if a method was called */
  wasCalled(method: keyof IRuntimeBlock): boolean {
    return this._calls.some(c => c.method === method);
  }
  
  /** Get call count for a method */
  callCount(method: keyof IRuntimeBlock): number {
    return this.getCallsFor(method).length;
  }
  
  /** Clear recorded calls */
  clearCalls(): void {
    this._calls = [];
  }
  
  // ... intercepted methods follow same pattern
}
```

### 2. TestableRuntime

Wraps `IScriptRuntime` to track all memory and stack operations.

```typescript
// src/runtime/testing/TestableRuntime.ts

import { IScriptRuntime } from '../IScriptRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { IRuntimeMemory } from '../IRuntimeMemory';
import { IMemoryReference, TypedMemoryReference } from '../IMemoryReference';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { IEvent } from '../IEvent';
import { RuntimeError } from '../actions/ErrorAction';
import { IMetricCollector } from '../MetricCollector';
import { ExecutionRecord } from '../models/ExecutionRecord';
import { MemoryOperation, StackOperation } from './TestableBlock';

/**
 * Snapshot of runtime state at a point in time
 */
export interface RuntimeSnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: number;
  
  /** Stack state */
  stack: {
    depth: number;
    blockKeys: string[];
    currentBlockKey?: string;
  };
  
  /** Memory state */
  memory: {
    entries: Array<{
      id: string;
      ownerId: string;
      type: string;
      visibility: 'public' | 'private';
      value: any;
    }>;
    totalCount: number;
  };
  
  /** Label for this snapshot */
  label?: string;
}

/**
 * Diff between two snapshots
 */
export interface SnapshotDiff {
  before: RuntimeSnapshot;
  after: RuntimeSnapshot;
  
  stack: {
    pushed: string[];
    popped: string[];
    depthChange: number;
  };
  
  memory: {
    allocated: string[];
    released: string[];
    modified: Array<{ id: string; oldValue: any; newValue: any }>;
  };
}

/**
 * Configuration for TestableRuntime
 */
export interface TestableRuntimeConfig {
  /** Pre-populate memory with these entries */
  initialMemory?: Array<{
    type: string;
    ownerId: string;
    value: any;
    visibility?: 'public' | 'private';
  }>;
  
  /** Pre-populate stack with these block stubs */
  initialStack?: Array<{
    key: string;
    blockType?: string;
    label?: string;
  }>;
}

/**
 * TestableRuntime wraps IScriptRuntime to provide:
 * - Operation tracking (memory allocations, stack changes)
 * - State snapshots for before/after comparisons
 * - Pre-configured initial state for testing
 * 
 * @example
 * ```typescript
 * const testRuntime = new TestableRuntime(realRuntime, {
 *   initialMemory: [
 *     { type: 'metric:reps', ownerId: 'parent', value: 21, visibility: 'public' }
 *   ]
 * });
 * 
 * const before = testRuntime.snapshot('before mount');
 * block.mount(testRuntime);
 * const after = testRuntime.snapshot('after mount');
 * const diff = testRuntime.diff(before, after);
 * ```
 */
export class TestableRuntime implements IScriptRuntime {
  private _memoryOps: MemoryOperation[] = [];
  private _stackOps: StackOperation[] = [];
  private _snapshots: RuntimeSnapshot[] = [];
  
  constructor(
    private readonly _wrapped: IScriptRuntime,
    config: TestableRuntimeConfig = {}
  ) {
    // Apply initial memory state
    if (config.initialMemory) {
      for (const entry of config.initialMemory) {
        this._wrapped.memory.allocate(
          entry.type,
          entry.ownerId,
          entry.value,
          entry.visibility ?? 'private'
        );
      }
    }
    
    // Apply initial stack state (using stub blocks)
    if (config.initialStack) {
      for (const stub of config.initialStack) {
        const stubBlock = this._createStubBlock(stub);
        this._wrapped.stack.push(stubBlock);
      }
    }
    
    this._wrapMemory();
    this._wrapStack();
  }
  
  // ========== IScriptRuntime Properties (delegated) ==========
  
  get script(): WodScript {
    return this._wrapped.script;
  }
  
  get memory(): IRuntimeMemory {
    return this._wrappedMemory;
  }
  
  get stack(): RuntimeStack {
    return this._wrappedStack;
  }
  
  get jit(): JitCompiler {
    return this._wrapped.jit;
  }
  
  get errors(): RuntimeError[] | undefined {
    return this._wrapped.errors;
  }
  
  get metrics(): IMetricCollector | undefined {
    return this._wrapped.metrics;
  }
  
  get executionLog(): ExecutionRecord[] {
    return this._wrapped.executionLog;
  }
  
  // ========== IScriptRuntime Methods (delegated) ==========
  
  isComplete(): boolean {
    return this._wrapped.isComplete();
  }
  
  handle(event: IEvent): void {
    this._wrapped.handle(event);
  }
  
  // ========== Testing API ==========
  
  /** All recorded memory operations */
  get memoryOperations(): ReadonlyArray<MemoryOperation> {
    return [...this._memoryOps];
  }
  
  /** All recorded stack operations */
  get stackOperations(): ReadonlyArray<StackOperation> {
    return [...this._stackOps];
  }
  
  /** All captured snapshots */
  get snapshots(): ReadonlyArray<RuntimeSnapshot> {
    return [...this._snapshots];
  }
  
  /** Clear all recorded operations */
  clearOperations(): void {
    this._memoryOps = [];
    this._stackOps = [];
  }
  
  /** Capture current state as a snapshot */
  snapshot(label?: string): RuntimeSnapshot {
    const memoryRefs = this._wrapped.memory.search({
      id: null,
      ownerId: null,
      type: null,
      visibility: null
    });
    
    const snapshot: RuntimeSnapshot = {
      timestamp: Date.now(),
      label,
      stack: {
        depth: this._wrapped.stack.blocks.length,
        blockKeys: this._wrapped.stack.blocks.map(b => b.key.toString()),
        currentBlockKey: this._wrapped.stack.current?.key.toString()
      },
      memory: {
        entries: memoryRefs.map(ref => ({
          id: ref.id,
          ownerId: ref.ownerId,
          type: ref.type,
          visibility: ref.visibility,
          value: ref.value()
        })),
        totalCount: memoryRefs.length
      }
    };
    
    this._snapshots.push(snapshot);
    return snapshot;
  }
  
  /** Calculate diff between two snapshots */
  diff(before: RuntimeSnapshot, after: RuntimeSnapshot): SnapshotDiff {
    const beforeMemIds = new Set(before.memory.entries.map(e => e.id));
    const afterMemIds = new Set(after.memory.entries.map(e => e.id));
    
    const allocated = after.memory.entries
      .filter(e => !beforeMemIds.has(e.id))
      .map(e => e.id);
    
    const released = before.memory.entries
      .filter(e => !afterMemIds.has(e.id))
      .map(e => e.id);
    
    const modified: Array<{ id: string; oldValue: any; newValue: any }> = [];
    for (const afterEntry of after.memory.entries) {
      const beforeEntry = before.memory.entries.find(e => e.id === afterEntry.id);
      if (beforeEntry && JSON.stringify(beforeEntry.value) !== JSON.stringify(afterEntry.value)) {
        modified.push({
          id: afterEntry.id,
          oldValue: beforeEntry.value,
          newValue: afterEntry.value
        });
      }
    }
    
    const beforeStackKeys = new Set(before.stack.blockKeys);
    const afterStackKeys = new Set(after.stack.blockKeys);
    
    return {
      before,
      after,
      stack: {
        pushed: after.stack.blockKeys.filter(k => !beforeStackKeys.has(k)),
        popped: before.stack.blockKeys.filter(k => !afterStackKeys.has(k)),
        depthChange: after.stack.depth - before.stack.depth
      },
      memory: {
        allocated,
        released,
        modified
      }
    };
  }
  
  // ========== Private Helpers ==========
  
  private _wrappedMemory!: IRuntimeMemory;
  private _wrappedStack!: RuntimeStack;
  
  private _wrapMemory(): void {
    const self = this;
    const original = this._wrapped.memory;
    
    this._wrappedMemory = {
      allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private') {
        const ref = original.allocate(type, ownerId, initialValue, visibility);
        self._memoryOps.push({
          operation: 'allocate',
          type,
          ownerId,
          refId: ref.id,
          value: initialValue,
          timestamp: Date.now()
        });
        return ref;
      },
      
      get<T>(reference: TypedMemoryReference<T>) {
        const value = original.get(reference);
        self._memoryOps.push({
          operation: 'get',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          value,
          timestamp: Date.now()
        });
        return value;
      },
      
      set<T>(reference: TypedMemoryReference<T>, value: T) {
        self._memoryOps.push({
          operation: 'set',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          value,
          timestamp: Date.now()
        });
        original.set(reference, value);
      },
      
      release(reference: IMemoryReference) {
        self._memoryOps.push({
          operation: 'release',
          type: reference.type,
          ownerId: reference.ownerId,
          refId: reference.id,
          timestamp: Date.now()
        });
        original.release(reference);
      },
      
      search(criteria: any) {
        const refs = original.search(criteria);
        self._memoryOps.push({
          operation: 'search',
          type: criteria.type ?? '*',
          ownerId: criteria.ownerId ?? '*',
          timestamp: Date.now()
        });
        return refs;
      },
      
      subscribe(callback: any) {
        return original.subscribe(callback);
      }
    };
  }
  
  private _wrapStack(): void {
    const self = this;
    
    // Create a proxy for the stack that records operations
    this._wrappedStack = new Proxy(this._wrapped.stack, {
      get(target, prop) {
        if (prop === 'push') {
          return function(block: any) {
            self._stackOps.push({
              operation: 'push',
              blockKey: block.key.toString(),
              blockType: block.blockType,
              timestamp: Date.now()
            });
            return target.push(block);
          };
        }
        
        if (prop === 'pop') {
          return function() {
            const block = target.pop();
            if (block) {
              self._stackOps.push({
                operation: 'pop',
                blockKey: block.key.toString(),
                blockType: block.blockType,
                timestamp: Date.now()
              });
            }
            return block;
          };
        }
        
        return (target as any)[prop];
      }
    }) as RuntimeStack;
  }
  
  private _createStubBlock(config: { key: string; blockType?: string; label?: string }) {
    return {
      key: { toString: () => config.key } as any,
      sourceIds: [],
      blockType: config.blockType ?? 'stub',
      label: config.label ?? config.key,
      mount: () => [],
      next: () => [],
      unmount: () => [],
      dispose: () => {},
      getBehavior: () => undefined
    };
  }
}
```

### 3. TestableBlockHarness

A React component that orchestrates the test scenario setup and visualization.

```typescript
// src/runtime/testing/TestableBlockHarness.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { TestableBlock, MethodCall, TestableBlockConfig } from './TestableBlock';
import { TestableRuntime, RuntimeSnapshot, SnapshotDiff, TestableRuntimeConfig } from './TestableRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { ScriptRuntime } from '../ScriptRuntime';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../parser/WodScript';

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
  
  /** Configuration for the testable block wrapper */
  blockConfig?: TestableBlockConfig;
  
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
}

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
  className = ''
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
      
      // Wrap in testable block
      const testableBlock = new TestableBlock(
        realBlock,
        selectedScenario.blockConfig
      );
      
      // Take before snapshot
      const beforeSnapshot = testRuntime.snapshot(`Before ${selectedScenario.phase}`);
      
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
        methodCalls: [...testableBlock.calls],
        actionsReturned,
        validation,
        executionTimeMs: performance.now() - startTime
      };
      
      setResult(scenarioResult);
      onScenarioExecute?.(scenarioResult);
      
    } catch (error) {
      const errorResult: ScenarioResult = {
        scenario: selectedScenario,
        success: false,
        beforeSnapshot: { timestamp: 0, stack: { depth: 0, blockKeys: [] }, memory: { entries: [], totalCount: 0 } },
        afterSnapshot: { timestamp: 0, stack: { depth: 0, blockKeys: [] }, memory: { entries: [], totalCount: 0 } },
        diff: { before: {} as any, after: {} as any, stack: { pushed: [], popped: [], depthChange: 0 }, memory: { allocated: [], released: [], modified: [] } },
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
  
  return (
    <div className={`testable-block-harness ${className}`}>
      {/* Scenario Selector */}
      <div className="scenario-selector mb-4">
        <label className="block text-sm font-medium mb-2">Select Scenario:</label>
        <select
          value={selectedScenarioId}
          onChange={(e) => setSelectedScenarioId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>
              [{s.phase.toUpperCase()}] {s.name}
            </option>
          ))}
        </select>
        
        {selectedScenario && (
          <p className="text-sm text-gray-600 mt-2">{selectedScenario.description}</p>
        )}
      </div>
      
      {/* Execute Button */}
      <button
        onClick={executeScenario}
        disabled={isExecuting || !selectedScenario}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isExecuting ? 'Executing...' : `Execute ${selectedScenario?.phase.toUpperCase()}`}
      </button>
      
      {/* Results Display */}
      {result && (
        <div className="results mt-6 space-y-4">
          {/* Status Banner */}
          <div className={`p-3 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="font-bold">
              {result.success ? '✅ PASSED' : '❌ FAILED'}
            </span>
            <span className="ml-2 text-sm text-gray-600">
              ({result.executionTimeMs.toFixed(2)}ms)
            </span>
          </div>
          
          {/* Stack Changes */}
          <div className="stack-changes">
            <h4 className="font-medium mb-2">Stack Changes</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Pushed:</span>
                <span className="ml-2 font-mono">{result.diff.stack.pushed.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Popped:</span>
                <span className="ml-2 font-mono">{result.diff.stack.popped.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Depth Δ:</span>
                <span className="ml-2 font-mono">{result.diff.stack.depthChange}</span>
              </div>
            </div>
          </div>
          
          {/* Memory Changes */}
          <div className="memory-changes">
            <h4 className="font-medium mb-2">Memory Changes</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Allocated:</span>
                <span className="ml-2 font-mono">{result.diff.memory.allocated.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Released:</span>
                <span className="ml-2 font-mono">{result.diff.memory.released.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Modified:</span>
                <span className="ml-2 font-mono">{result.diff.memory.modified.length}</span>
              </div>
            </div>
            
            {/* Modified Values Detail */}
            {result.diff.memory.modified.length > 0 && (
              <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                {result.diff.memory.modified.map((mod, i) => (
                  <div key={i}>
                    {mod.id}: {JSON.stringify(mod.oldValue)} → {JSON.stringify(mod.newValue)}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Method Calls */}
          <div className="method-calls">
            <h4 className="font-medium mb-2">Method Calls</h4>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
              {result.methodCalls.map((call, i) => (
                <div key={i} className="py-1">
                  <span className="text-blue-600">{call.method}</span>
                  <span className="text-gray-500 ml-2">({call.duration.toFixed(2)}ms)</span>
                  {call.error && (
                    <span className="text-red-600 ml-2">Error: {call.error.message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions Returned */}
          <div className="actions-returned">
            <h4 className="font-medium mb-2">Actions Returned</h4>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
              {result.actionsReturned.length === 0 ? (
                <span className="text-gray-500">No actions returned</span>
              ) : (
                result.actionsReturned.map((action, i) => (
                  <div key={i}>{action.type ?? action.constructor?.name ?? 'Unknown'}</div>
                ))
              )}
            </div>
          </div>
          
          {/* Validation Failures */}
          {!result.validation.passed && (
            <div className="validation-failures bg-red-50 p-3 rounded">
              <h4 className="font-medium mb-2 text-red-700">Validation Failures</h4>
              <ul className="list-disc list-inside text-sm text-red-600">
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
  calls: MethodCall[],
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
```

---

## Storybook Integration

### Story Structure

```
stories/
└── block-testing/
    ├── Push.stories.tsx       # Push phase scenarios
    ├── Next.stories.tsx       # Next phase scenarios
    ├── Pop.stories.tsx        # Pop phase scenarios
    └── Complex.stories.tsx    # Multi-phase scenarios
```

### Example Stories

```typescript
// stories/block-testing/Push.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing/TestableBlockHarness';
import { EffortBlock, EffortBlockConfig } from '@/runtime/blocks/EffortBlock';
import { RoundsBlock, RoundsBlockConfig } from '@/runtime/blocks/RoundsBlock';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Push Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the PUSH lifecycle phase of runtime blocks.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== EffortBlock Push Scenarios ====================

const effortBlockPushScenarios: TestScenario[] = [
  {
    id: 'effort-push-basic',
    name: 'EffortBlock Basic Push',
    description: 'Tests basic EffortBlock initialization on push. Expects memory allocation for rep tracking.',
    phase: 'push',
    blockFactory: (runtime) => new EffortBlock(runtime, [1], {
      exerciseName: 'Air Squats',
      targetReps: 10
    }),
    expectations: {
      memoryAllocations: 1, // Rep tracking state
      stackPushes: 1,
      actionsReturned: 0 // No child blocks
    }
  },
  {
    id: 'effort-push-with-parent-context',
    name: 'EffortBlock with Parent Rep Context',
    description: 'Tests EffortBlock when parent has published reps metric. Should inherit reps from parent.',
    phase: 'push',
    blockFactory: (runtime) => new EffortBlock(runtime, [2], {
      exerciseName: 'Thrusters',
      targetReps: 21 // Will be overridden by parent context
    }),
    runtimeConfig: {
      initialMemory: [
        { type: 'metric:reps', ownerId: 'parent-block', value: 15, visibility: 'public' }
      ],
      initialStack: [
        { key: 'parent-block', blockType: 'rounds', label: '3 Rounds' }
      ]
    },
    expectations: {
      memoryAllocations: 1,
      stackPushes: 1
    }
  }
];

export const EffortBlockPush: Story = {
  args: {
    scenarios: effortBlockPushScenarios
  }
};

// ==================== RoundsBlock Push Scenarios ====================

const roundsBlockPushScenarios: TestScenario[] = [
  {
    id: 'rounds-push-basic',
    name: 'RoundsBlock Basic Push',
    description: 'Tests RoundsBlock initialization. Should allocate loop state and push first child.',
    phase: 'push',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 3,
      children: [[2], [3]] // Two child groups
    }),
    expectations: {
      memoryAllocations: 2, // Loop state + rounds metric
      actionsReturned: 1 // PushBlockAction for first child
    }
  },
  {
    id: 'rounds-push-rep-scheme',
    name: 'RoundsBlock with Rep Scheme (21-15-9)',
    description: 'Tests RoundsBlock with variable rep scheme. Should allocate public reps metric.',
    phase: 'push',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[2, 3]] // One child group per round
    }),
    expectations: {
      memoryAllocations: 3, // Loop state + rounds metric + reps metric (public)
      actionsReturned: 1
    }
  }
];

export const RoundsBlockPush: Story = {
  args: {
    scenarios: roundsBlockPushScenarios
  }
};
```

```typescript
// stories/block-testing/Next.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing/TestableBlockHarness';
import { RoundsBlock } from '@/runtime/blocks/RoundsBlock';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Next Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the NEXT lifecycle phase (child completion handling).'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const roundsNextScenarios: TestScenario[] = [
  {
    id: 'rounds-next-advance-child',
    name: 'RoundsBlock Advance to Next Child',
    description: 'Tests RoundsBlock.next() advancing to the next child in the round.',
    phase: 'next',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 3,
      children: [[2], [3], [4]] // Three child groups
    }),
    runtimeConfig: {
      // Simulate first child already completed
      initialMemory: [
        { type: 'loop-state', ownerId: 'test', value: { index: 0, position: 0, rounds: 0 } }
      ]
    },
    expectations: {
      actionsReturned: 1 // PushBlockAction for next child
    }
  },
  {
    id: 'rounds-next-round-boundary',
    name: 'RoundsBlock Cross Round Boundary',
    description: 'Tests RoundsBlock.next() when crossing from round 1 to round 2.',
    phase: 'next',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[2]] // One child per round
    }),
    blockConfig: {
      // Spy on next to see rep context updates
      nextMode: 'spy'
    },
    expectations: {
      actionsReturned: 1 // PushBlockAction for round 2
    }
  },
  {
    id: 'rounds-next-complete',
    name: 'RoundsBlock Complete (No More Rounds)',
    description: 'Tests RoundsBlock.next() when all rounds are complete. Should return PopBlockAction.',
    phase: 'next',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 2,
      children: [[2]]
    }),
    runtimeConfig: {
      initialMemory: [
        // Simulate being at the end of round 2
        { type: 'loop-state', ownerId: 'test', value: { index: 1, position: 0, rounds: 2 } }
      ]
    },
    expectations: {
      actionsReturned: 1 // PopBlockAction (completion)
    }
  }
];

export const RoundsBlockNext: Story = {
  args: {
    scenarios: roundsNextScenarios
  }
};
```

```typescript
// stories/block-testing/Pop.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing/TestableBlockHarness';
import { EffortBlock } from '@/runtime/blocks/EffortBlock';
import { RoundsBlock } from '@/runtime/blocks/RoundsBlock';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Pop Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the POP lifecycle phase (cleanup and disposal).'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const popScenarios: TestScenario[] = [
  {
    id: 'effort-pop-cleanup',
    name: 'EffortBlock Cleanup on Pop',
    description: 'Tests that EffortBlock properly releases memory on dispose.',
    phase: 'pop',
    blockFactory: (runtime) => new EffortBlock(runtime, [1], {
      exerciseName: 'Burpees',
      targetReps: 10
    }),
    expectations: {
      memoryReleases: 1, // Rep tracking state
      stackPops: 1
    }
  },
  {
    id: 'rounds-pop-cleanup',
    name: 'RoundsBlock Cleanup on Pop',
    description: 'Tests that RoundsBlock releases all allocated memory including public metrics.',
    phase: 'pop',
    blockFactory: (runtime) => new RoundsBlock(runtime, [1], {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [[2]]
    }),
    expectations: {
      memoryReleases: 3, // Loop state + rounds metric + reps metric
      stackPops: 1
    }
  }
];

export const BlockCleanup: Story = {
  args: {
    scenarios: popScenarios
  }
};
```

---

## Visualization Components

### SnapshotDiffViewer

```typescript
// src/runtime/testing/components/SnapshotDiffViewer.tsx

import React from 'react';
import { RuntimeSnapshot, SnapshotDiff } from '../TestableRuntime';

interface SnapshotDiffViewerProps {
  diff: SnapshotDiff;
  className?: string;
}

/**
 * Visual diff viewer for before/after runtime snapshots.
 * Shows stack and memory changes with color-coded additions/removals.
 */
export const SnapshotDiffViewer: React.FC<SnapshotDiffViewerProps> = ({
  diff,
  className = ''
}) => {
  return (
    <div className={`snapshot-diff-viewer grid grid-cols-2 gap-4 ${className}`}>
      {/* Before Snapshot */}
      <div className="before-snapshot">
        <h4 className="font-medium mb-2 text-gray-600">
          BEFORE
          <span className="text-xs ml-2">
            ({new Date(diff.before.timestamp).toLocaleTimeString()})
          </span>
        </h4>
        
        {/* Stack */}
        <div className="stack-view mb-4">
          <h5 className="text-sm font-medium mb-1">Stack ({diff.before.stack.depth})</h5>
          <div className="space-y-1">
            {diff.before.stack.blockKeys.map((key, i) => (
              <div
                key={key}
                className={`p-2 rounded text-sm font-mono ${
                  diff.stack.popped.includes(key)
                    ? 'bg-red-100 line-through'
                    : 'bg-gray-100'
                }`}
              >
                {i === diff.before.stack.blockKeys.length - 1 ? '→ ' : '  '}
                {key}
              </div>
            ))}
          </div>
        </div>
        
        {/* Memory */}
        <div className="memory-view">
          <h5 className="text-sm font-medium mb-1">
            Memory ({diff.before.memory.totalCount})
          </h5>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {diff.before.memory.entries.map(entry => (
              <div
                key={entry.id}
                className={`p-2 rounded text-xs font-mono ${
                  diff.memory.released.includes(entry.id)
                    ? 'bg-red-100 line-through'
                    : diff.memory.modified.some(m => m.id === entry.id)
                    ? 'bg-yellow-100'
                    : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-blue-600">{entry.type}</span>
                  <span className="text-gray-500">{entry.visibility}</span>
                </div>
                <div className="truncate">{JSON.stringify(entry.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* After Snapshot */}
      <div className="after-snapshot">
        <h4 className="font-medium mb-2 text-gray-600">
          AFTER
          <span className="text-xs ml-2">
            ({new Date(diff.after.timestamp).toLocaleTimeString()})
          </span>
        </h4>
        
        {/* Stack */}
        <div className="stack-view mb-4">
          <h5 className="text-sm font-medium mb-1">Stack ({diff.after.stack.depth})</h5>
          <div className="space-y-1">
            {diff.after.stack.blockKeys.map((key, i) => (
              <div
                key={key}
                className={`p-2 rounded text-sm font-mono ${
                  diff.stack.pushed.includes(key)
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }`}
              >
                {i === diff.after.stack.blockKeys.length - 1 ? '→ ' : '  '}
                {key}
              </div>
            ))}
          </div>
        </div>
        
        {/* Memory */}
        <div className="memory-view">
          <h5 className="text-sm font-medium mb-1">
            Memory ({diff.after.memory.totalCount})
          </h5>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {diff.after.memory.entries.map(entry => (
              <div
                key={entry.id}
                className={`p-2 rounded text-xs font-mono ${
                  diff.memory.allocated.includes(entry.id)
                    ? 'bg-green-100'
                    : diff.memory.modified.some(m => m.id === entry.id)
                    ? 'bg-yellow-100'
                    : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-blue-600">{entry.type}</span>
                  <span className="text-gray-500">{entry.visibility}</span>
                </div>
                <div className="truncate">{JSON.stringify(entry.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Implementation Effort Estimate

### Phase 1: Core Infrastructure (3-4 days)
| Task | Effort | Priority |
|------|--------|----------|
| `TestableBlock<T>` wrapper class | 4 hours | High |
| `TestableRuntime` wrapper class | 6 hours | High |
| Unit tests for wrappers | 4 hours | High |
| Memory operation tracking | 4 hours | High |
| Stack operation tracking | 2 hours | High |
| Snapshot/diff utilities | 4 hours | Medium |

### Phase 2: Harness Component (2-3 days)
| Task | Effort | Priority |
|------|--------|----------|
| `TestableBlockHarness` React component | 8 hours | High |
| Scenario configuration system | 4 hours | High |
| Validation engine | 4 hours | Medium |
| `SnapshotDiffViewer` component | 4 hours | Medium |
| CSS/Tailwind styling | 2 hours | Low |

### Phase 3: Storybook Integration (2 days)
| Task | Effort | Priority |
|------|--------|----------|
| Push phase stories | 4 hours | High |
| Next phase stories | 4 hours | High |
| Pop phase stories | 3 hours | High |
| Complex multi-phase stories | 3 hours | Medium |
| Documentation | 2 hours | Medium |

### Phase 4: Block-Specific Scenarios (Ongoing)
| Task | Effort | Priority |
|------|--------|----------|
| EffortBlock scenarios | 3 hours | High |
| RoundsBlock scenarios | 4 hours | High |
| TimerBlock scenarios | 4 hours | Medium |
| TimeBoundRoundsBlock scenarios | 4 hours | Medium |
| Edge case scenarios | 6 hours | Low |

**Total Estimated Effort: 8-10 days**

---

## Key Design Decisions

### 1. Proxy Pattern for Interception
Using the Proxy pattern allows us to wrap any `IRuntimeBlock` without modifying the original classes. This maintains the integrity of production code while enabling comprehensive testing.

### 2. Snapshot-Based Diffing
Rather than tracking individual operations in real-time, we capture complete snapshots before and after each phase. This provides:
- Clean before/after visualization
- Atomic state comparison
- Support for complex multi-operation scenarios

### 3. Scenario-Based Testing
Each test is defined as a `TestScenario` object containing:
- Factory function for block creation
- Runtime pre-configuration
- Expected outcomes

This enables:
- Repeatable tests
- Easy scenario sharing
- Clear documentation of expected behavior

### 4. Phase Isolation
Separating stories by lifecycle phase (push/next/pop) provides:
- Focused debugging
- Clear mental model of block behavior
- Easier identification of phase-specific bugs

---

## Usage Examples

### Basic Block Testing

```typescript
// Testing a custom block's push behavior
const scenario: TestScenario = {
  id: 'my-block-push',
  name: 'MyBlock Push Test',
  description: 'Verifies MyBlock allocates correct memory on mount',
  phase: 'push',
  testBlockId: 'my-block-1',  // Easy to identify in visualizations
  blockFactory: (runtime) => new MyBlock(runtime, [1], myConfig),
  expectations: {
    memoryAllocations: 2,
    actionsReturned: 0
  }
};
```

### Testing with Pre-configured State

```typescript
// Testing block behavior with existing parent context
const scenario: TestScenario = {
  id: 'my-block-with-parent',
  name: 'MyBlock with Parent Context',
  description: 'Verifies MyBlock inherits values from parent',
  phase: 'push',
  testBlockId: 'child-block-1',
  blockFactory: (runtime) => new MyBlock(runtime, [2], myConfig),
  runtimeConfig: {
    initialMemory: [
      { type: 'metric:reps', ownerId: 'parent', value: 21, visibility: 'public' }
    ],
    initialStack: [
      { key: 'parent', blockType: 'rounds', label: '3 Rounds' }
    ]
  }
};
```

### Testing with Method Override

```typescript
// Testing specific behavior by overriding methods
const scenario: TestScenario = {
  id: 'my-block-override',
  name: 'MyBlock with Override',
  description: 'Tests block with custom next() implementation',
  phase: 'next',
  testBlockId: 'override-block-1',
  blockFactory: (runtime) => new MyBlock(runtime, [1], myConfig),
  blockConfig: {
    nextMode: 'override',
    nextOverride: (runtime) => {
      // Custom implementation for testing
      return [new PopBlockAction()];
    }
  }
};
```

---

## Conclusion

This testable block architecture provides a comprehensive framework for:

1. **Isolating** individual block behavior from the full runtime
2. **Visualizing** memory and stack changes at each lifecycle phase
3. **Pre-configuring** complex state scenarios
4. **Validating** expected outcomes with clear assertions
5. **Documenting** block behavior through Storybook stories

The modular design ensures that testing infrastructure can grow alongside the block implementation without impacting production code.
