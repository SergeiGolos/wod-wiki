# JIT Test Harness Spike

> **Goal**: Design a test harness that enables standing up real runtime environments with controllable memory/stack states, pushing behaviors directly, and validating state after next/push/pop operations.

## Implementation Status (2025-12-26)

| Strategy | Status | Location |
|----------|--------|----------|
| Strategy 1: Builder Pattern | ✅ Implemented | `tests/harness/RuntimeTestBuilder.ts` |
| Strategy 2: Behavior Injection | ✅ Implemented | `tests/harness/BehaviorTestHarness.ts`, `MockBlock.ts` |
| Strategy 3: State Machine | 🔲 Not Implemented | N/A |
| Strategy 4: Fixtures | 🔲 Not Implemented | N/A |

**Hybrid Approach Adoption:**
- `BehaviorTestHarness` used for unit tests (behaviors) - 1 file migrated
- `RuntimeTestBuilder` used for integration tests (strategies) - 1 file migrated
- 17 harness self-tests passing
- 9 test files still using inline mocks (pending migration)

See [Implementation Plan](./plan/test-harness-implementation.md) for detailed status.

---

## Problem Statement

Testing JIT-compiled runtime blocks requires:
1. A real `ScriptRuntime` with memory and stack
2. Ability to pre-populate memory with specific values
3. Ability to push blocks with specific behaviors onto the stack
4. Ability to trigger lifecycle operations (`mount`, `next`, `unmount`)
5. Ability to validate state changes (memory values, stack depth, events emitted)

Current testing approaches use inline mocks (see `TimerBehavior.test.ts`, `EffortStrategy.test.ts`), which work for unit tests but don't enable integration testing of the full lifecycle.

---

## Architecture Overview

### Core Runtime Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        ScriptRuntime                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ RuntimeStack │  │RuntimeMemory │  │   EventBus   │          │
│  │  (blocks)    │  │ (references) │  │  (handlers)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                  │                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ RuntimeClock │  │ JitCompiler  │  │   Tracker    │          │
│  │   (time)     │  │ (strategies) │  │   (spans)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Existing Testing Infrastructure

| Component          | Location                                 | Purpose                                            |
| ------------------ | ---------------------------------------- | -------------------------------------------------- |
| `TestableRuntime`  | `src/runtime/testing/TestableRuntime.ts` | Wraps IScriptRuntime, tracks operations, snapshots |
| `TestableBlock`    | `src/runtime/testing/TestableBlock.ts`   | Wraps IRuntimeBlock, intercepts methods            |
| `ITestSetupAction` | `src/runtime/testing/actions/`           | Actions to manipulate state before tests           |
| `createMockClock`  | `src/runtime/RuntimeClock.ts`            | Controllable clock for time manipulation           |
| **NEW: `BehaviorTestHarness`** | `tests/harness/BehaviorTestHarness.ts` | Unit test harness for behaviors |
| **NEW: `MockBlock`** | `tests/harness/MockBlock.ts` | Configurable IRuntimeBlock for behavior testing |
| **NEW: `RuntimeTestBuilder`** | `tests/harness/RuntimeTestBuilder.ts` | Builder for integration tests |

---

## Strategy 1: Builder Pattern with Real Runtime

### Concept

Create a `RuntimeTestBuilder` that constructs a real `ScriptRuntime` with a fluent API for configuring initial state.

### API Design

```typescript
import { RuntimeTestBuilder } from 'tests/harness';

const harness = new RuntimeTestBuilder()
  // Configure memory
  .withMemory('metric:reps', 'parent-block', 21, 'public')
  .withMemory('timer:state', 'timer-1', { elapsed: 5000 }, 'private')
  
  // Configure clock
  .withClock(new Date('2024-01-01T12:00:00Z'))
  
  // Configure strategies
  .withStrategy(new EffortStrategy())
  .withStrategy(new RoundsStrategy())
  
  // Pre-compile a script
  .withScript('3 Rounds\n  10 Pushups')
  
  // Build the runtime
  .build();

// Push a block
const block = harness.pushStatement(0, { includeChildren: true });

// Trigger lifecycle
const mountActions = block.mount(harness.runtime);
harness.executeActions(mountActions);

// Advance time and trigger next
harness.advanceClock(1000);
const nextActions = block.next(harness.runtime);
harness.executeActions(nextActions);

// Assert state
expect(harness.getMemory('metric:reps', 'block-key')).toBe(10);
expect(harness.stackDepth).toBe(2);
```

### Implementation

```typescript
// src/runtime/testing/RuntimeTestBuilder.ts

import { ScriptRuntime, ScriptRuntimeDependencies } from '../ScriptRuntime';
import { RuntimeMemory } from '../RuntimeMemory';
import { RuntimeStack } from '../RuntimeStack';
import { EventBus } from '../EventBus';
import { JitCompiler } from '../JitCompiler';
import { createMockClock } from '../RuntimeClock';
import { WodScript, parseWodScript } from '../../parser/WodScript';
import { IRuntimeBlockStrategy } from '../IRuntimeBlockStrategy';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { IRuntimeAction } from '../IRuntimeAction';
import { TypedMemoryReference } from '../IMemoryReference';

interface MemoryEntry {
  type: string;
  ownerId: string;
  value: any;
  visibility: 'public' | 'private' | 'inherited';
}

interface RuntimeTestHarness {
  runtime: ScriptRuntime;
  clock: ReturnType<typeof createMockClock>;
  
  // Stack operations
  pushStatement(index: number, options?: { includeChildren?: boolean }): IRuntimeBlock;
  pushBlock(block: IRuntimeBlock): void;
  popBlock(): IRuntimeBlock | undefined;
  get stackDepth(): number;
  get currentBlock(): IRuntimeBlock | undefined;
  
  // Memory operations
  getMemory<T>(type: string, ownerId: string): T | undefined;
  setMemory<T>(ref: TypedMemoryReference<T>, value: T): void;
  allocateMemory<T>(type: string, ownerId: string, value: T, visibility?: string): TypedMemoryReference<T>;
  
  // Time operations
  advanceClock(ms: number): void;
  
  // Action execution
  executeActions(actions: IRuntimeAction[]): void;
  
  // Event simulation
  simulateEvent(name: string, data?: any): void;
  simulateNext(): void;
  
  // Assertions helpers
  snapshot(label?: string): RuntimeSnapshot;
  diff(before: RuntimeSnapshot, after: RuntimeSnapshot): SnapshotDiff;
  
  // Cleanup
  dispose(): void;
}

export class RuntimeTestBuilder {
  private memoryEntries: MemoryEntry[] = [];
  private strategies: IRuntimeBlockStrategy[] = [];
  private clockTime: Date = new Date();
  private scriptText: string = '';
  
  withMemory(type: string, ownerId: string, value: any, visibility: 'public' | 'private' | 'inherited' = 'private'): this {
    this.memoryEntries.push({ type, ownerId, value, visibility });
    return this;
  }
  
  withClock(time: Date): this {
    this.clockTime = time;
    return this;
  }
  
  withStrategy(strategy: IRuntimeBlockStrategy): this {
    this.strategies.push(strategy);
    return this;
  }
  
  withScript(script: string): this {
    this.scriptText = script;
    return this;
  }
  
  build(): RuntimeTestHarness {
    // Create dependencies
    const memory = new RuntimeMemory();
    const stack = new RuntimeStack();
    const eventBus = new EventBus();
    const clock = createMockClock(this.clockTime);
    
    // Create JIT compiler with strategies
    const jit = new JitCompiler(this.strategies);
    
    // Parse script
    const script = parseWodScript(this.scriptText);
    
    // Create runtime
    const deps: ScriptRuntimeDependencies = { memory, stack, clock, eventBus };
    const runtime = new ScriptRuntime(script, jit, deps);
    
    // Pre-populate memory
    const memoryRefs = new Map<string, TypedMemoryReference<any>>();
    for (const entry of this.memoryEntries) {
      const ref = memory.allocate(entry.type, entry.ownerId, entry.value, entry.visibility);
      memoryRefs.set(`${entry.type}:${entry.ownerId}`, ref);
    }
    
    return {
      runtime,
      clock,
      
      pushStatement(index, options = {}) {
        const statement = script.getAt(index);
        if (!statement) throw new Error(`No statement at index ${index}`);
        
        let statements = [statement];
        if (options.includeChildren && statement.children?.length) {
          const childIds = statement.children.flat();
          statements = [...statements, ...script.getIds(childIds)];
        }
        
        const block = jit.compile(statements, runtime);
        if (!block) throw new Error('Failed to compile statement');
        
        return runtime.pushBlock(block);
      },
      
      pushBlock(block) {
        runtime.pushBlock(block);
      },
      
      popBlock() {
        return runtime.popBlock();
      },
      
      get stackDepth() {
        return stack.count;
      },
      
      get currentBlock() {
        return stack.current;
      },
      
      getMemory<T>(type: string, ownerId: string): T | undefined {
        const refs = memory.search({ type, ownerId, id: null, visibility: null });
        if (refs.length === 0) return undefined;
        return memory.get(refs[0] as TypedMemoryReference<T>);
      },
      
      setMemory<T>(ref: TypedMemoryReference<T>, value: T) {
        memory.set(ref, value);
      },
      
      allocateMemory<T>(type: string, ownerId: string, value: T, visibility = 'private') {
        return memory.allocate(type, ownerId, value, visibility as any);
      },
      
      advanceClock(ms: number) {
        clock.advance(ms);
      },
      
      executeActions(actions: IRuntimeAction[]) {
        for (const action of actions) {
          action.do(runtime);
        }
      },
      
      simulateEvent(name: string, data?: any) {
        runtime.handle({ name, timestamp: clock.now, data });
      },
      
      simulateNext() {
        this.simulateEvent('next');
      },
      
      snapshot(label?: string) {
        // Implementation from TestableRuntime.snapshot()
        return {
          timestamp: Date.now(),
          label,
          stack: {
            depth: stack.count,
            blockKeys: stack.blocks.map(b => b.key.toString()),
            currentBlockKey: stack.current?.key.toString()
          },
          memory: {
            entries: [], // Simplified - full impl would enumerate memory
            totalCount: 0
          }
        };
      },
      
      diff(before, after) {
        return {
          before,
          after,
          stack: {
            pushed: after.stack.blockKeys.filter(k => !before.stack.blockKeys.includes(k)),
            popped: before.stack.blockKeys.filter(k => !after.stack.blockKeys.includes(k)),
            depthChange: after.stack.depth - before.stack.depth
          },
          memory: {
            allocated: [],
            released: [],
            modified: []
          }
        };
      },
      
      dispose() {
        runtime.dispose();
      }
    };
  }
}
```

### Example Test

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { RuntimeTestBuilder } from '@/runtime/testing';
import { EffortStrategy } from '@/runtime/strategies/EffortStrategy';
import { RoundsStrategy } from '@/runtime/strategies/RoundsStrategy';

describe('Rounds Block Integration', () => {
  let harness: ReturnType<RuntimeTestBuilder['build']>;
  
  afterEach(() => {
    harness?.dispose();
  });
  
  it('should iterate through 3 rounds', () => {
    harness = new RuntimeTestBuilder()
      .withStrategy(new RoundsStrategy())
      .withStrategy(new EffortStrategy())
      .withScript('3 Rounds\n  10 Pushups')
      .build();
    
    // Push rounds block
    const roundsBlock = harness.pushStatement(0, { includeChildren: true });
    expect(harness.stackDepth).toBe(1);
    
    // Mount triggers first child push
    harness.executeActions(roundsBlock.mount(harness.runtime));
    expect(harness.stackDepth).toBe(2); // Rounds + Effort
    
    // Complete child block, should advance to next round
    harness.simulateNext();
    expect(harness.stackDepth).toBe(2); // Still 2 - new effort pushed
    
    // Check round state
    const loopState = harness.getMemory('loop:state', roundsBlock.key.toString());
    expect(loopState?.currentIndex).toBe(1); // Second round
  });
});
```

---

## Strategy 2: Behavior Injection Pattern

### Concept

Instead of pre-populating memory and using JIT compilation, inject behaviors directly into a minimal block shell.

### API Design

```typescript
import { BehaviorTestHarness, MockBlock } from '@/runtime/testing';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01T12:00:00Z'));

// Create a minimal block with specific behaviors
const block = new MockBlock('test-effort', [
  new TimerBehavior('up'),
  new CompletionBehavior(() => block.isComplete, ['next'])
]);

// Push and mount
harness.push(block);
const mountActions = harness.mount();

// Verify timer started
const timerBehavior = block.getBehavior(TimerBehavior);
expect(timerBehavior.isRunning()).toBe(true);

// Advance time
harness.advanceClock(5000);
expect(timerBehavior.getElapsedMs()).toBe(5000);

// Trigger next
const nextActions = harness.next();
expect(nextActions).toContainActionOfType(PopStackItemAction);
```

### Implementation

```typescript
// src/runtime/testing/BehaviorTestHarness.ts

import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../IRuntimeBlock';
import { IRuntimeAction } from '../IRuntimeAction';
import { BlockKey } from '../../core/models/BlockKey';
import { createMockClock } from '../RuntimeClock';
import { RuntimeMemory } from '../RuntimeMemory';
import { RuntimeStack } from '../RuntimeStack';
import { EventBus } from '../EventBus';
import { IBlockContext } from '../IBlockContext';

class MockBlockContext implements IBlockContext {
  readonly ownerId: string;
  readonly exerciseId: string;
  readonly references: ReadonlyArray<any> = [];
  
  constructor(blockId: string, private memory: RuntimeMemory) {
    this.ownerId = blockId;
    this.exerciseId = blockId;
  }
  
  allocate<T>(type?: string, initialValue?: T, visibility?: string): any {
    return this.memory.allocate(type ?? 'default', this.ownerId, initialValue, visibility as any);
  }
  
  get<T>(type?: string): T | undefined { return undefined; }
  getAll<T>(type?: string): T[] { return []; }
  release(): void {}
  isReleased(): boolean { return false; }
  getOrCreateAnchor(): any { return null; }
}

export class MockBlock implements IRuntimeBlock {
  readonly key = new BlockKey();
  readonly sourceIds: number[] = [];
  readonly blockType = 'MockBlock';
  readonly label: string;
  readonly context: IBlockContext;
  readonly fragments = [];
  executionTiming: BlockLifecycleOptions = {};
  
  private _runtime: any;
  
  constructor(
    label: string,
    private readonly behaviors: IRuntimeBehavior[],
    memory?: RuntimeMemory
  ) {
    this.label = label;
    this.context = new MockBlockContext(this.key.toString(), memory ?? new RuntimeMemory());
  }
  
  setRuntime(runtime: any): void {
    this._runtime = runtime;
  }
  
  mount(runtime: any, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPush?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  next(runtime: any, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onNext?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  unmount(runtime: any, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
      const result = behavior.onPop?.(runtime, this, options);
      if (result) actions.push(...result);
    }
    return actions;
  }
  
  dispose(runtime: any): void {
    for (const behavior of this.behaviors) {
      if (typeof (behavior as any).onDispose === 'function') {
        (behavior as any).onDispose(runtime, this);
      }
    }
  }
  
  getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
    return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
  }
}

export class BehaviorTestHarness {
  private clock = createMockClock();
  private memory = new RuntimeMemory();
  private stack = new RuntimeStack();
  private eventBus = new EventBus();
  private mockRuntime: any;
  
  constructor() {
    this.mockRuntime = this.createMockRuntime();
  }
  
  private createMockRuntime(): any {
    return {
      memory: this.memory,
      stack: this.stack,
      eventBus: this.eventBus,
      clock: this.clock,
      handle: (event: any) => this.eventBus.dispatch(event, this.mockRuntime),
      pushBlock: (block: IRuntimeBlock) => {
        this.stack.push(block);
        return block;
      },
      popBlock: () => {
        const block = this.stack.pop();
        if (block) block.dispose(this.mockRuntime);
        return block;
      }
    };
  }
  
  withClock(time: Date): this {
    this.clock = createMockClock(time);
    this.mockRuntime.clock = this.clock;
    return this;
  }
  
  push(block: IRuntimeBlock): this {
    if (typeof (block as any).setRuntime === 'function') {
      (block as any).setRuntime(this.mockRuntime);
    }
    this.stack.push(block);
    return this;
  }
  
  mount(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this.stack.current;
    if (!block) throw new Error('No block on stack');
    const actions = block.mount(this.mockRuntime, { startTime: this.clock.now, ...options });
    this.executeActions(actions);
    return actions;
  }
  
  next(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this.stack.current;
    if (!block) throw new Error('No block on stack');
    const actions = block.next(this.mockRuntime, options);
    this.executeActions(actions);
    return actions;
  }
  
  unmount(options?: BlockLifecycleOptions): IRuntimeAction[] {
    const block = this.stack.current;
    if (!block) throw new Error('No block on stack');
    const actions = block.unmount(this.mockRuntime, { completedAt: this.clock.now, ...options });
    this.executeActions(actions);
    this.stack.pop();
    block.dispose(this.mockRuntime);
    return actions;
  }
  
  advanceClock(ms: number): void {
    this.clock.advance(ms);
  }
  
  simulateEvent(name: string, data?: any): void {
    this.eventBus.dispatch({ name, timestamp: this.clock.now, data }, this.mockRuntime);
  }
  
  private executeActions(actions: IRuntimeAction[]): void {
    for (const action of actions) {
      action.do(this.mockRuntime);
    }
  }
  
  get currentBlock(): IRuntimeBlock | undefined {
    return this.stack.current;
  }
  
  get stackDepth(): number {
    return this.stack.count;
  }
  
  get runtime(): any {
    return this.mockRuntime;
  }
}
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { BehaviorTestHarness, MockBlock } from '@/runtime/testing';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { CompletionBehavior } from '@/runtime/behaviors/CompletionBehavior';

describe('TimerBehavior + CompletionBehavior Integration', () => {
  it('should complete when countdown reaches zero', () => {
    const harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
    
    let isComplete = false;
    const block = new MockBlock('countdown-test', [
      new TimerBehavior('down', 10000), // 10 second countdown
      new CompletionBehavior(() => isComplete, ['timer:complete'])
    ]);
    
    harness.push(block);
    harness.mount();
    
    const timerBehavior = block.getBehavior(TimerBehavior)!;
    expect(timerBehavior.isRunning()).toBe(true);
    expect(timerBehavior.getRemainingMs()).toBe(10000);
    
    // Advance past completion
    harness.advanceClock(12000);
    expect(timerBehavior.isComplete()).toBe(true);
    isComplete = true;
    
    // Trigger next - should pop
    harness.simulateEvent('timer:complete');
    expect(harness.stackDepth).toBe(0);
  });
});
```

---

## Strategy 3: State Machine Testing Pattern

### Concept

Model block lifecycle as a state machine and test transitions explicitly.

### API Design

```typescript
import { BlockStateMachine, StateTransition } from '@/runtime/testing';

const sm = new BlockStateMachine(RoundsBlock, {
  roundCount: 3,
  children: [{ type: 'effort', reps: 10 }]
});

// Define expected transitions
sm.expectTransition('init', 'mounted', {
  trigger: 'mount',
  assertions: [
    { memory: 'loop:state', value: { currentIndex: 0, total: 3 } },
    { stackDelta: +1, reason: 'child pushed' }
  ]
});

sm.expectTransition('mounted', 'round-2', {
  trigger: 'childComplete',
  assertions: [
    { memory: 'loop:state', value: { currentIndex: 1, total: 3 } }
  ]
});

// Execute and verify
await sm.run();
```

### Implementation Sketch

```typescript
// src/runtime/testing/BlockStateMachine.ts

interface StateAssertion {
  memory?: { type: string; value: any };
  stackDelta?: number;
  eventEmitted?: string;
  behaviorState?: { behaviorType: any; property: string; value: any };
}

interface TransitionDef {
  trigger: 'mount' | 'next' | 'unmount' | 'event' | string;
  eventData?: any;
  assertions: StateAssertion[];
}

type TransitionMap = Map<string, Map<string, TransitionDef>>;

export class BlockStateMachine<T extends IRuntimeBlock> {
  private transitions: TransitionMap = new Map();
  private currentState = 'init';
  private harness: BehaviorTestHarness;
  private block: T;
  
  constructor(
    blockFactory: (harness: BehaviorTestHarness) => T,
    config: any
  ) {
    this.harness = new BehaviorTestHarness();
    this.block = blockFactory(this.harness);
  }
  
  expectTransition(
    fromState: string,
    toState: string,
    transition: TransitionDef
  ): this {
    if (!this.transitions.has(fromState)) {
      this.transitions.set(fromState, new Map());
    }
    this.transitions.get(fromState)!.set(toState, transition);
    return this;
  }
  
  async run(): Promise<void> {
    this.harness.push(this.block);
    
    for (const [fromState, toStates] of this.transitions) {
      if (fromState !== this.currentState) continue;
      
      for (const [toState, transition] of toStates) {
        // Execute trigger
        switch (transition.trigger) {
          case 'mount':
            this.harness.mount();
            break;
          case 'next':
            this.harness.next();
            break;
          case 'unmount':
            this.harness.unmount();
            break;
          default:
            this.harness.simulateEvent(transition.trigger, transition.eventData);
        }
        
        // Verify assertions
        for (const assertion of transition.assertions) {
          if (assertion.memory) {
            const actual = this.harness.runtime.memory.search({
              type: assertion.memory.type,
              ownerId: null,
              id: null,
              visibility: null
            });
            // Assert value matches...
          }
        }
        
        this.currentState = toState;
      }
    }
  }
}
```

---

## Strategy 4: Scenario-Based Testing with Fixtures

### Concept

Define test scenarios as JSON/YAML fixtures that describe initial state, actions, and expected outcomes.

### Fixture Format

```yaml
# tests/fixtures/rounds-completion.yaml
name: "Rounds Block Completes After 3 Iterations"
description: "Verifies that a rounds block correctly iterates and completes"

setup:
  script: |
    3 Rounds
      10 Pushups
  memory:
    - type: "workout:state"
      ownerId: "root"
      value: { started: true }
  clock: "2024-01-01T12:00:00Z"

actions:
  - type: pushStatement
    index: 0
    includeChildren: true
    
  - type: mount
    expect:
      stackDepth: 2
      memory:
        - type: "loop:state"
          ownerId: "{{currentBlock}}"
          value: { currentIndex: 0, total: 3 }

  - type: simulateNext
    repeat: 3
    expectAfterEach:
      - stackDepth: 2  # Child replaced
      
  - type: simulateNext
    expect:
      stackDepth: 0  # All complete
      
assertions:
  - eventEmitted: "workout:complete"
  - memoryReleased: "loop:state"
```

### Implementation

```typescript
// src/runtime/testing/FixtureRunner.ts

import YAML from 'yaml';
import { RuntimeTestBuilder } from './RuntimeTestBuilder';

interface FixtureAction {
  type: string;
  [key: string]: any;
}

interface FixtureExpectation {
  stackDepth?: number;
  memory?: Array<{ type: string; ownerId: string; value: any }>;
  eventEmitted?: string;
}

interface TestFixture {
  name: string;
  description?: string;
  setup: {
    script: string;
    memory?: Array<{ type: string; ownerId: string; value: any }>;
    clock?: string;
  };
  actions: FixtureAction[];
  assertions?: FixtureExpectation[];
}

export class FixtureRunner {
  private harness: ReturnType<RuntimeTestBuilder['build']>;
  private capturedEvents: string[] = [];
  
  constructor(private fixture: TestFixture) {
    const builder = new RuntimeTestBuilder()
      .withScript(fixture.setup.script);
    
    if (fixture.setup.clock) {
      builder.withClock(new Date(fixture.setup.clock));
    }
    
    if (fixture.setup.memory) {
      for (const entry of fixture.setup.memory) {
        builder.withMemory(entry.type, entry.ownerId, entry.value);
      }
    }
    
    this.harness = builder.build();
    
    // Capture events
    this.harness.runtime.eventBus.on('*', (event) => {
      this.capturedEvents.push(event.name);
    }, 'fixture-runner');
  }
  
  async run(): Promise<TestResult> {
    const results: StepResult[] = [];
    
    for (const action of this.fixture.actions) {
      const stepResult = await this.executeAction(action);
      results.push(stepResult);
      
      if (!stepResult.passed) {
        return { passed: false, steps: results };
      }
    }
    
    // Final assertions
    if (this.fixture.assertions) {
      for (const assertion of this.fixture.assertions) {
        if (assertion.eventEmitted && !this.capturedEvents.includes(assertion.eventEmitted)) {
          results.push({
            action: 'final-assertion',
            passed: false,
            error: `Expected event "${assertion.eventEmitted}" was not emitted`
          });
          return { passed: false, steps: results };
        }
      }
    }
    
    this.harness.dispose();
    return { passed: true, steps: results };
  }
  
  private async executeAction(action: FixtureAction): Promise<StepResult> {
    try {
      switch (action.type) {
        case 'pushStatement':
          this.harness.pushStatement(action.index, { includeChildren: action.includeChildren });
          break;
        case 'mount':
          this.harness.executeActions(this.harness.currentBlock!.mount(this.harness.runtime));
          break;
        case 'simulateNext':
          const repeat = action.repeat ?? 1;
          for (let i = 0; i < repeat; i++) {
            this.harness.simulateNext();
          }
          break;
        case 'advanceClock':
          this.harness.advanceClock(action.ms);
          break;
      }
      
      // Verify expectations
      if (action.expect) {
        this.verifyExpectations(action.expect);
      }
      
      return { action: action.type, passed: true };
    } catch (error) {
      return { action: action.type, passed: false, error: String(error) };
    }
  }
  
  private verifyExpectations(expect: FixtureExpectation): void {
    if (expect.stackDepth !== undefined) {
      if (this.harness.stackDepth !== expect.stackDepth) {
        throw new Error(`Expected stack depth ${expect.stackDepth}, got ${this.harness.stackDepth}`);
      }
    }
    
    if (expect.memory) {
      for (const entry of expect.memory) {
        const actual = this.harness.getMemory(entry.type, entry.ownerId);
        // Deep equality check...
      }
    }
  }
}

interface TestResult {
  passed: boolean;
  steps: StepResult[];
}

interface StepResult {
  action: string;
  passed: boolean;
  error?: string;
}
```

### Vitest Integration

```typescript
// tests/fixtures.test.ts
import { describe, it, expect } from 'vitest';
import { FixtureRunner } from '@/runtime/testing';
import { loadFixtures } from './utils';

const fixtures = loadFixtures('tests/fixtures/*.yaml');

describe('Runtime Fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, async () => {
      const runner = new FixtureRunner(fixture);
      const result = await runner.run();
      
      if (!result.passed) {
        const failedStep = result.steps.find(s => !s.passed);
        throw new Error(`Step "${failedStep?.action}" failed: ${failedStep?.error}`);
      }
      
      expect(result.passed).toBe(true);
    });
  }
});
```

---

## Comparison Matrix

| Feature | Builder Pattern | Behavior Injection | State Machine | Fixtures |
|---------|-----------------|-------------------|---------------|----------|
| **Setup Complexity** | Medium | Low | High | Low |
| **Flexibility** | High | Medium | Medium | Low |
| **Reusability** | Medium | High | High | Very High |
| **Learning Curve** | Low | Low | High | Low |
| **Integration Testing** | ✅ Full | ⚠️ Partial | ✅ Full | ✅ Full |
| **Unit Testing** | ⚠️ Overkill | ✅ Ideal | ⚠️ Overkill | ❌ Too heavy |
| **CI Performance** | Fast | Very Fast | Medium | Medium |
| **Debugging** | Good | Excellent | Good | Fair |

---

## Recommended Approach

### Hybrid Strategy

Use different approaches for different testing needs:

1. **Unit Tests (behaviors)**: Use `BehaviorTestHarness` with `MockBlock`
   - Fast, isolated, minimal setup
   - Test individual behavior logic

2. **Integration Tests (blocks)**: Use `RuntimeTestBuilder`
   - Real runtime with controllable state
   - Test block lifecycle and behavior composition

3. **Regression Tests**: Use `FixtureRunner` with YAML fixtures
   - Easy to add new test cases
   - Non-developers can contribute scenarios

4. **Complex Scenarios**: Use `BlockStateMachine`
   - Explicit state transitions
   - Clear documentation of expected behavior

### Implementation Order

1. **Phase 1**: Extend existing `TestableRuntime` with builder methods
2. **Phase 2**: Create `MockBlock` for behavior testing
3. **Phase 3**: Add fixture runner for regression tests
4. **Phase 4**: Add state machine pattern for complex scenarios

---

## Files to Create

```
src/runtime/testing/
├── RuntimeTestBuilder.ts     # Strategy 1
├── BehaviorTestHarness.ts    # Strategy 2  
├── MockBlock.ts              # Strategy 2 helper
├── BlockStateMachine.ts      # Strategy 3
├── FixtureRunner.ts          # Strategy 4
└── index.ts                  # Updated exports
```

---

## Next Steps

1. Review this document and select preferred strategy(ies)
2. Create detailed implementation plan for selected approach
3. Implement core harness
4. Add example tests demonstrating usage
5. Document testing patterns in project README or CONTRIBUTING.md
