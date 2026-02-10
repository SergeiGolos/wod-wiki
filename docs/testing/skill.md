# Testing Skill Guide: WOD-Wiki Testing Platform

A practical guide for writing tests using the WOD-Wiki test harnesses, mocks, and helpers. Covers the full testing stack from low-level behavior isolation to end-to-end workout simulation.

## Overview

The test infrastructure is organized into **four layers**, each targeting a different testing scope:

| Layer | Harness / Helper | Purpose | Uses Real Runtime? |
|-------|-----------------|---------|-------------------|
| **1. Behavior Unit** | `BehaviorTestHarness` | Test individual behaviors in isolation via `IBehaviorContext` | No (mock runtime) |
| **2. Integration Helpers** | `test-helpers.ts` (`createMockRuntime`, `mountBehaviors`, …) | Test multi-behavior compositions with a lightweight mock context | No (mock runtime + mock block) |
| **3. Execution Context** | `ExecutionContextTestHarness` | Test action execution, clock freezing, event dispatch, JIT compilation via real `ScriptRuntime` | Yes |
| **4. Workout Simulation** | `WorkoutTestHarness` | End-to-end workout simulation with real parser + real JIT | Yes |

Additional utilities:
- **`MockBlock`** — Configurable `IRuntimeBlock` stub with block-owned memory
- **`MockJitCompiler`** — Extends `JitCompiler` with recording + predicate matching
- **`ExecutionContextTestBuilder`** — Fluent builder for `ExecutionContextTestHarness`
- **Factory functions** — `createTimerTestHarness`, `createBehaviorTestHarness`, `createEventTestHarness`, etc.
- **`TestableBlock` / `TestableRuntime`** — Spy wrappers for real blocks/runtime
- **Setup Actions** — `SetTimerStateAction`, `SetLoopIndexAction`, `AllocateTestMemoryAction`, etc.

---

## Quick Start: Choosing the Right Harness

```
Is the test about a single behavior's lifecycle?
  └─ YES → BehaviorTestHarness (Layer 1) or integration test-helpers (Layer 2)
Does the test involve multiple behaviors composing together?
  └─ YES → Integration test-helpers (Layer 2)
Does the test need real ScriptRuntime (action queue, ExecutionContext)?
  └─ YES → ExecutionContextTestHarness (Layer 3)
Does the test need real parser + JIT + workout flow?
  └─ YES → WorkoutTestHarness (Layer 4)
```

---

## Layer 1: BehaviorTestHarness

Best for testing individual behaviors against the `IBehaviorContext` contract.

### Import

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BehaviorTestHarness, createBehaviorHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';
```

### Pattern: Behavior Lifecycle

```typescript
describe('TimerInitBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness();
    harness.withClock(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should initialize timer memory on mount', () => {
    // 1. Setup: Create block with behavior
    const behavior = new TimerInitBehavior({
      direction: 'down',
      durationMs: 10000,
      label: 'Countdown'
    });
    const block = new MockBlock('timer-block', [behavior]);

    // 2. Push and mount
    harness.push(block);
    const actions = harness.mount();

    // 3. Assert memory was written
    const timerMemory = harness.getMemory('timer');
    expect(timerMemory).toBeDefined();
    expect(timerMemory.direction).toBe('down');
    expect(timerMemory.durationMs).toBe(10000);
  });

  it('should close span on unmount', () => {
    const behavior = new TimerInitBehavior({
      direction: 'down',
      durationMs: 10000
    });
    const block = new MockBlock('timer', [behavior]);

    harness.push(block);
    harness.mount();
    harness.advanceClock(5000);
    harness.unmount();

    const timerMemory = harness.getMemory('timer');
    expect(timerMemory.spans[0].ended).toBeDefined();
  });

  it('should emit completion via markComplete', () => {
    const behavior = new TimerCompletionBehavior();
    const block = new MockBlock('timer', [
      new TimerInitBehavior({ direction: 'down', durationMs: 3000 }),
      new TimerTickBehavior(),
      behavior
    ]);

    harness.push(block);
    harness.mount();

    // Simulate ticks past duration
    for (let i = 0; i < 4; i++) {
      harness.advanceClock(1000);
      harness.simulateTick();
    }

    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('timer-expired');
  });
});
```

### Key API

| Method | Description |
|--------|-------------|
| `harness.withClock(date)` | Set initial clock time |
| `harness.withMemory(type, ownerId, value)` | Pre-allocate memory |
| `harness.push(block)` | Push block onto stack (does not mount) |
| `harness.mount(options?)` | Mount current block, returns actions |
| `harness.next(options?)` | Call `onNext` on current block |
| `harness.unmount(options?)` | Unmount and dispose current block |
| `harness.advanceClock(ms)` | Advance mock clock |
| `harness.simulateEvent(name, data?)` | Dispatch event through runtime |
| `harness.simulateTick()` | Shorthand for `simulateEvent('tick')` |
| `harness.simulateNext()` | Shorthand for `simulateEvent('next')` |
| `harness.getMemory(type, ownerId?)` | Read memory value |
| `harness.currentBlock` | Current block on stack |
| `harness.stackDepth` | Stack depth |
| `harness.capturedActions` | All captured actions |
| `harness.capturedEvents` | All captured events |
| `harness.findActions(ActionClass)` | Filter actions by class |
| `harness.findEvents(name)` | Filter events by name |
| `harness.dispose()` | Cleanup |

---

## Layer 2: Integration Test Helpers

Best for testing how multiple behaviors compose together inside a block. Uses lightweight mocks that don't involve the full `ScriptRuntime`.

### Import

```typescript
import {
    createMockRuntime,
    createMockBlock,
    mountBehaviors,
    unmountBehaviors,
    advanceBehaviors,
    simulateTicks,
    dispatchEvent,
    expectMemoryState,
    calculateElapsed,
    findEvents,
    findOutputs,
    createIntegrationContext,
    MockRuntime,
    MockBlock
} from './test-helpers';
```

### Pattern: Multi-Behavior Composition

```typescript
describe('AMRAP Pattern', () => {
    let runtime: MockRuntime;
    let block: MockBlock;

    const createAmrapBehaviors = (durationMs: number = 60000) => [
        new TimerInitBehavior({ direction: 'down', durationMs, label: 'AMRAP' }),
        new TimerTickBehavior(),
        new TimerCompletionBehavior(),
        new RoundInitBehavior({ totalRounds: undefined, startRound: 1 }),
        new RoundAdvanceBehavior(),
        new DisplayInitBehavior({ mode: 'countdown', label: 'AMRAP' }),
    ];

    beforeEach(() => {
        runtime = createMockRuntime(0);
        block = createMockBlock({ label: 'AMRAP Test' });
    });

    it('should initialize timer and rounds on mount', () => {
        const behaviors = createAmrapBehaviors();

        mountBehaviors(behaviors, runtime, block);

        expectMemoryState(block, 'timer', {
            direction: 'down',
            durationMs: 60000
        });

        expectMemoryState(block, 'round', {
            current: 1,
            total: undefined
        });
    });

    it('should track rounds without auto-completing', () => {
        const behaviors = createAmrapBehaviors();
        const ctx = mountBehaviors(behaviors, runtime, block);

        for (let i = 0; i < 5; i++) {
            advanceBehaviors(behaviors, ctx);
        }

        expect(runtime.completionReason).toBeUndefined();

        const round = block.memory.get('round') as RoundState;
        expect(round.current).toBe(6);
    });

    it('should complete when timer expires', () => {
        const behaviors = createAmrapBehaviors(5000);
        const ctx = mountBehaviors(behaviors, runtime, block);

        simulateTicks(runtime, ctx, 6, 1000);

        expect(runtime.completionReason).toBe('timer-expired');
    });
});
```

### Key API

| Function | Description |
|----------|-------------|
| `createMockRuntime(startTime)` | Create a mock runtime with controllable clock |
| `createMockBlock(config?)` | Create a mock block with `Map`-based memory |
| `createIntegrationContext(runtime, block)` | Create `IBehaviorContext` wired to mocks |
| `mountBehaviors(behaviors, runtime, block)` | Mount all behaviors, returns context |
| `advanceBehaviors(behaviors, ctx)` | Call `onNext` on all behaviors |
| `unmountBehaviors(behaviors, ctx)` | Call `onUnmount` on all behaviors |
| `simulateTicks(runtime, ctx, count, intervalMs)` | Advance clock and dispatch tick events |
| `dispatchEvent(runtime, ctx, eventType, data?)` | Dispatch event to subscribed handlers |
| `expectMemoryState(block, type, expected)` | Assert memory contains expected values |
| `calculateElapsed(timerState, now)` | Sum elapsed time across spans |
| `findEvents(runtime, name)` | Filter events by name |
| `findOutputs(runtime, type)` | Filter outputs by type |

---

## Layer 3: ExecutionContextTestHarness

Best for testing real `ScriptRuntime` behavior: action queue processing, clock freezing during turns, event dispatch, and JIT compilation.

### Import

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';
```

### Pattern: Action Execution & Turn Tracking

```typescript
describe('Action Execution Flow', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z'),
      maxDepth: 20
    });
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should record actions with turn and iteration tracking', () => {
    harness.executeAction({
      type: 'setup',
      do: () => {}
    });

    harness.executeAction({
      type: 'execute',
      do: () => {}
    });

    expect(harness.actionExecutions).toHaveLength(2);
    expect(harness.actionExecutions[0].action.type).toBe('setup');
    expect(harness.actionExecutions[0].turnId).toBe(1);
    expect(harness.actionExecutions[1].action.type).toBe('execute');
    expect(harness.actionExecutions[1].turnId).toBe(2);
  });

  it('should track nested actions within same turn', () => {
    harness.executeAction({
      type: 'parent',
      do: (runtime) => {
        runtime.do({
          type: 'child',
          do: () => {}
        });
      }
    });

    // Both are in the same turn
    const parent = harness.getActionsByType('parent')[0];
    const child = harness.getActionsByType('child')[0];
    expect(parent.turnId).toBe(child.turnId);
    expect(parent.iteration).toBe(1);
    expect(child.iteration).toBe(2);
  });
});
```

### Pattern: Clock Behavior

```typescript
describe('Clock Behavior', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z')
    });
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should freeze clock during execution turn', () => {
    const timestamps: Date[] = [];

    harness.executeAction({
      type: 'test',
      do: (runtime) => {
        timestamps.push(runtime.clock.now);
        runtime.do({
          type: 'nested',
          do: (rt) => {
            timestamps.push(rt.clock.now);
          }
        });
      }
    });

    // All timestamps in same turn are identical
    expect(timestamps[0].getTime()).toBe(timestamps[1].getTime());
  });

  it('should advance time between separate actions', () => {
    harness.executeAction({ type: 'first', do: () => {} });
    harness.advanceClock(5000);
    harness.executeAction({ type: 'second', do: () => {} });

    const timestamps = harness.actionExecutions.map(e => e.timestamp.getTime());
    expect(timestamps[1] - timestamps[0]).toBe(5000);
  });

  it('should support fluent chaining', () => {
    const result = harness
      .advanceClock(1000)
      .setClock(new Date('2024-01-01T12:05:00Z'))
      .advanceClock(500);
    expect(result).toBe(harness);
  });
});
```

### Pattern: JIT Compilation Testing

```typescript
describe('JIT Compilation', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should compile blocks using MockJitCompiler matchers', () => {
    const timerBlock = new MockBlock('timer', []);
    harness.mockJit.whenTextContains('10:00', timerBlock);

    const result = harness.mockJit.compile(
      [{ id: 0, source: '10:00 Run' } as any],
      harness.runtime
    );

    expect(result).toBe(timerBlock);
    expect(harness.mockJit.compileCalls).toHaveLength(1);
    expect(harness.mockJit.lastCompileCall?.result).toBe(timerBlock);
  });

  it('should support custom predicate matching', () => {
    const complexBlock = new MockBlock('complex', []);

    harness.mockJit.whenMatches(
      (statements) => statements.length === 2 &&
        statements.some(s => JSON.stringify(s).includes('FOR TIME')),
      complexBlock
    );

    const result = harness.mockJit.compile(
      [
        { id: 0, meta: { raw: 'FOR TIME' } } as any,
        { id: 1, meta: { raw: '100 Air Squats' } } as any
      ],
      harness.runtime
    );

    expect(result).toBe(complexBlock);
  });

  it('should support factory functions for dynamic blocks', () => {
    let callCount = 0;
    harness.mockJit.whenTextContains('timer', () => {
      callCount++;
      return new MockBlock(`timer-${callCount}`, []);
    });

    const block1 = harness.mockJit.compile(
      [{ id: 0, meta: { raw: 'timer 1' } } as any],
      harness.runtime
    );
    const block2 = harness.mockJit.compile(
      [{ id: 1, meta: { raw: 'timer 2' } } as any],
      harness.runtime
    );

    expect(block1?.key.toString()).toBe('timer-1');
    expect(block2?.key.toString()).toBe('timer-2');
    expect(block1).not.toBe(block2);
  });
});
```

### Pattern: Event Handling

```typescript
describe('Event Handling', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should track event dispatch and resulting actions', () => {
    harness.eventBus.register(
      'timer:complete',
      {
        id: 'complete-handler',
        name: 'Complete Handler',
        handler: () => [{
          type: 'advance-to-next',
          do: () => {}
        }]
      },
      'test-owner',
      { scope: 'global' }
    );

    harness.dispatchEvent({
      name: 'timer:complete',
      timestamp: new Date(),
      data: { elapsed: 10000 }
    });

    expect(harness.wasEventDispatched('timer:complete')).toBe(true);
    expect(harness.eventDispatches).toHaveLength(1);
  });

  it('should filter events by name', () => {
    harness.dispatchEvent({ name: 'event-1', timestamp: new Date(), data: {} });
    harness.dispatchEvent({ name: 'event-2', timestamp: new Date(), data: {} });
    harness.dispatchEvent({ name: 'event-1', timestamp: new Date(), data: {} });

    expect(harness.getEventsByName('event-1')).toHaveLength(2);
    expect(harness.getEventsByName('event-2')).toHaveLength(1);
  });
});
```

### Pattern: StartWorkout Flow

```typescript
describe('Workout Start', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness({
      statements: [
        { id: 0, source: '10:00 Run' },
        { id: 1, source: '3x Push-ups' }
      ]
    });
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should start workout by dispatching StartWorkoutAction', () => {
    harness.mockJit.withDefaultBlock(new MockBlock('root', []));

    harness.startWorkout();

    expect(harness.wasActionExecuted('start-workout')).toBe(true);
    expect(harness.stack.count).toBeGreaterThan(0);
  });
});
```

### Convenience Methods

| Method | Description |
|--------|-------------|
| `pushAndMount(block)` | Push block + mount in one call |
| `executeAndAdvance(action, ms)` | Execute action + advance clock |
| `dispatchAndGetActions(event)` | Dispatch event, return resulting actions |
| `expectActionCount(type, n)` | Assert action executed N times (throws on mismatch) |
| `expectActionAtIteration(type, n)` | Assert action at specific iteration |
| `getLastAction(type)` | Most recent execution of an action type |
| `nextTurn()` | Force turn boundary with no-op action |
| `isComplete()` | Stack empty check |
| `startWorkout(options?)` | Dispatch `StartWorkoutAction` |

---

## Layer 4: WorkoutTestHarness

Best for end-to-end workout simulation with real parsing and JIT compilation.

### Import

```typescript
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness';
```

### Pattern: Full Workout Simulation

```typescript
describe('Workout Simulation', () => {
  it('should execute a simple workout', () => {
    const harness = new WorkoutTestBuilder()
      .withScript(`
        10:00 Run
        20 Push-ups
        15 Air Squats
      `)
      .withClock(new Date('2024-01-01T12:00:00Z'))
      .build();

    harness.mount();

    expect(harness.stackDepth).toBeGreaterThan(0);
    expect(harness.currentBlock).toBeDefined();

    // Advance through blocks
    harness.next();
    harness.next();

    const report = harness.getReport();
    expect(report.fragments.length).toBeGreaterThan(0);

    harness.dispose();
  });

  it('should handle timer completion', () => {
    const harness = new WorkoutTestBuilder()
      .withScript('5:00 AMRAP')
      .withClock(new Date('2024-01-01T12:00:00Z'))
      .build();

    harness.mount();

    // Advance clock past duration
    harness.advanceClock(300000); // 5 minutes

    expect(harness.isComplete()).toBe(true);

    const report = harness.getReport();
    expect(report.isComplete).toBe(true);

    harness.dispose();
  });
});
```

### WorkoutTestHarness API

| Method | Description |
|--------|-------------|
| `mount()` | Initialize workout |
| `next()` | Advance to next block |
| `complete()` | End workout early |
| `advanceClock(ms)` | Advance clock + dispatch tick |
| `clockTime` | Current clock time (ms) |
| `stackDepth` | Current stack depth |
| `currentBlock` | Current block |
| `isComplete()` | Workout complete check |
| `getReport()` | `WorkoutReport` with fragments, outputs, rounds |
| `dispose()` | Cleanup |

### WorkoutReport Shape

```typescript
interface WorkoutReport {
  roundsCompleted: number;
  partialReps: number;
  currentRound: number;
  elapsedTime: number;
  totalReps: Record<string, number>;
  restTaken: number;
  isComplete: boolean;
  fragments: ICodeFragment[][];
  outputs: IOutputStatement[];
}
```

---

## MockBlock API

`MockBlock` implements `IRuntimeBlock` and supports configurable behaviors, block-owned memory, and forced action overrides.

### Constructor

```typescript
// String ID shorthand
new MockBlock('timer-10min', [behavior1, behavior2]);

// Full config
new MockBlock('timer', [behavior1], {
  blockType: 'Timer',
  label: 'Countdown 10:00',
  sourceIds: [0, 1],
  fragments: [[timerFragment, actionFragment]],
  state: { mode: 'countdown' }
});

// Config-only (omit behaviors array)
new MockBlock({
  id: 'test-block',
  blockType: 'Loop',
  label: 'EMOM 10'
});
```

### MockBlockConfig

```typescript
interface MockBlockConfig {
  id?: string;          // Custom identifier
  blockType?: string;   // Block type label
  label?: string;       // Human-readable label
  sourceIds?: number[]; // Source statement IDs
  fragments?: ICodeFragment[][]; // Pre-configured fragments
  state?: Record<string, any>;  // Custom state for conditions
}
```

### Block-Owned Memory

MockBlock has block-scoped memory via `IMemoryEntry`:

```typescript
const block = new MockBlock('timer', []);

// Set memory
block.setMemoryValue('timer', {
  direction: 'down',
  durationMs: 10000,
  spans: [new TimeSpan(Date.now())],
  label: 'Test',
  role: 'primary'
});

// Read memory
const entry = block.getMemory('timer');
expect(entry?.value.direction).toBe('down');

// Check existence
expect(block.hasMemory('timer')).toBe(true);

// List all types
const types = block.getMemoryTypes();
```

### Forced Actions

Override lifecycle methods for testing specific action flows:

```typescript
const block = new MockBlock('test', []);

block.setMountActions([
  { type: 'custom-mount', do: () => {} }
]);

block.setNextActions([
  { type: 'custom-next', do: () => {} }
]);

block.setUnmountActions([
  { type: 'custom-unmount', do: () => {} }
]);
```

### Completion

```typescript
block.markComplete('timer-expired');
expect(block.isComplete).toBe(true);
expect(block.completionReason).toBe('timer-expired');
```

---

## MockJitCompiler API

Extends `JitCompiler` with recording and configurable matchers.

### Matchers

```typescript
// Text-based matching (case-insensitive, checks JSON.stringify)
mockJit.whenTextContains('10:00', timerBlock);

// Predicate-based matching
mockJit.whenMatches(
  (statements, runtime) => statements.some(s =>
    s.fragments?.some(f => f.fragmentType === FragmentType.Timer)
  ),
  timerBlock
);

// Factory function (dynamic block creation)
mockJit.whenMatches(
  (statements) => statements.length > 0,
  (statements, runtime) => new MockBlock(`dynamic-${statements[0].id}`, [])
);

// Default fallback
mockJit.withDefaultBlock(fallbackBlock);

// Priority (higher = evaluated first, default 0)
mockJit.whenTextContains('special', specialBlock, 10);
```

### Recording

```typescript
// All calls
expect(mockJit.compileCalls).toHaveLength(2);

// Most recent call
expect(mockJit.lastCompileCall?.result).toBe(expectedBlock);

// Predicate search
expect(mockJit.wasCompiled(c => c.statements.some(s => s.id === 1))).toBe(true);

// Statement IDs across all calls
const ids = mockJit.getCompiledStatementIds();

// Clear recordings (keeps matchers)
mockJit.clearCalls();
```

---

## ExecutionContextTestBuilder

Fluent builder for configuring `ExecutionContextTestHarness` with minimal boilerplate.

```typescript
const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .withMaxDepth(10)
  .withStrategies(new TimerStrategy(), new LoopStrategy())
  .whenTextContains('10:00', timerBlock)
  .whenCompiling(
    (stmts) => stmts.some(s => s.id === 42),
    specialBlock
  )
  .whenStatementIds([0, 1, 2], groupBlock)
  .withDefaultBlock(fallbackBlock)
  .withBlocks(preloadedBlock1, preloadedBlock2)
  .onEvent('timer:complete', {
    id: 'handler-1',
    name: 'Complete Handler',
    handler: () => [{ type: 'cleanup', do: () => {} }]
  })
  .build();
```

---

## Factory Functions

Pre-configured harness creation for common scenarios:

```typescript
// Timer testing
const harness = createTimerTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 20
});

// Single behavior in isolation
const harness = createBehaviorTestHarness(new TimerBehavior('up'), {
  blockId: 'timer-block',
  clockTime: new Date()
});

// JIT compilation strategies
const harness = createCompilationTestHarness([
  new TimerStrategy(),
  new LoopStrategy()
]);

// Pre-configured blocks
const harness = createBasicTestHarness({
  withTimerBlock: true,
  withLoopBlock: true
});

// Event handler presets
const harness = createEventTestHarness({
  'timer:complete': {
    id: 'h1', name: 'Handler 1',
    handler: () => [{ type: 'cleanup', do: () => {} }]
  }
});
```

---

## TestableBlock & TestableRuntime

Spy wrappers for real blocks and runtime. Useful when you want to test with production code but need visibility into internal calls.

### TestableBlock

```typescript
import { TestableBlock } from '@/testing/testable';

const realBlock = jit.compile(statements, runtime)!;
const testable = new TestableBlock(realBlock, {
  testId: 'effort-squats-1',
  mountMode: 'spy',    // 'spy' | 'override' | 'ignore'
  nextMode: 'spy'
});

testable.mount(runtime);

// Inspect calls
expect(testable.wasCalled('mount')).toBe(true);
expect(testable.calls).toHaveLength(1);
expect(testable.getCallsFor('mount')[0].returnValue).toEqual([...]);

// Find behaviors on the wrapped block
const timer = testable.getBehavior(TimerInitBehavior);
expect(timer).toBeDefined();
```

### TestableRuntime

Wraps `ScriptRuntime` with snapshot/diff capabilities and memory/stack operation recording.

```typescript
import { TestableRuntime } from '@/testing/testable';

const testRuntime = new TestableRuntime(script, jit, {
  initialMemory: [
    { type: 'timer', ownerId: 'block-1', value: timerState }
  ],
  initialStack: [
    { key: 'root', blockType: 'Workout' }
  ]
});

// Take snapshots
const before = testRuntime.snapshot();
testRuntime.do(someAction);
const after = testRuntime.snapshot();

// Diff
const diff = testRuntime.diff(before, after);
expect(diff.stack.pushed).toContain('new-block');
expect(diff.memory.allocated).toHaveLength(2);
```

---

## Setup Actions

Declarative memory pre-population for tests and Storybook. Serializable to/from JSON.

```typescript
import {
  SetTimerStateAction,
  SetLoopIndexAction,
  AllocateTestMemoryAction,
  SetEffortStateAction,
  createActionFromJSON,
  TEST_SETUP_PRESETS
} from '@/testing/setup';

// Direct use
const timerSetup = new SetTimerStateAction({
  direction: 'down',
  durationMs: 600000,
  label: 'For Time'
});
timerSetup.execute(runtime, blockKey);

// From JSON (for Storybook/serialization)
const action = createActionFromJSON({
  type: 'set-timer-state',
  params: { direction: 'up', label: 'Clock' }
});

// Presets
const amrapPreset = TEST_SETUP_PRESETS.find(p => p.id === 'amrap-timer');
```

---

## Common Assertion Patterns

### Checking Compilation Results

```typescript
// Compilation count
expect(harness.mockJit.compileCalls).toHaveLength(expectedCount);

// Last result
expect(harness.mockJit.lastCompileCall?.result?.key.toString()).toBe('expected-id');

// Statement source check
const calls = harness.mockJit.compileCalls;
expect(JSON.stringify(calls[0].statements)).toContain('expected text');

// Was a specific statement compiled?
expect(harness.mockJit.wasCompiled(
  c => c.statements.some(s => s.id === targetId)
)).toBe(true);
```

### Checking Action Execution

```typescript
// Was action executed?
expect(harness.wasActionExecuted('action-type')).toBe(true);

// How many times?
expect(harness.getActionsByType('action-type')).toHaveLength(count);

// Execution order
expect(harness.actionExecutions.map(e => e.action.type))
  .toEqual(['first', 'second', 'third']);

// By turn
expect(harness.getActionsByTurn(1)).toHaveLength(expectedCount);

// Assert exact count (throws on mismatch)
harness.expectActionCount('mount', 1);

// Assert at specific iteration
harness.expectActionAtIteration('mount', 1);
```

### Checking Clock State

```typescript
// Clock at expected time
expect(harness.clock.now.getTime()).toBe(expectedTime);

// Time difference between actions
const timestamps = harness.actionExecutions.map(e => e.timestamp.getTime());
expect(timestamps[1] - timestamps[0]).toBe(5000);

// Clock frozen during turn
const turnActions = harness.getActionsByTurn(1);
const uniqueTimes = new Set(turnActions.map(a => a.timestamp.getTime()));
expect(uniqueTimes.size).toBe(1);
```

### Checking Memory (BehaviorTestHarness)

```typescript
// Via harness
const timer = harness.getMemory('timer');
expect(timer?.direction).toBe('down');

// Via block directly
const entry = block.getMemory('timer');
expect(entry?.value.durationMs).toBe(10000);

// Via integration helpers
expectMemoryState(block, 'timer', {
  direction: 'down',
  durationMs: 10000
});
```

### Checking Events

```typescript
// Was event dispatched?
expect(harness.wasEventDispatched('timer:complete')).toBe(true);

// Filter by name
const events = harness.getEventsByName('timer:complete');
expect(events).toHaveLength(1);

// Event data
expect(events[0].event.data).toEqual({ expected: 'data' });

// BehaviorTestHarness
expect(harness.wasEventEmitted('timer:complete')).toBe(true);
const timerEvents = harness.findEvents('timer:complete');
```

---

## Test Isolation & Cleanup

### Always Dispose

```typescript
afterEach(() => {
  harness.dispose();
});
```

### Clear Recordings for Fresh State

```typescript
harness.clearRecordings(); // ExecutionContextTestHarness
harness.clearCaptures();   // BehaviorTestHarness
```

### Use Descriptive Block IDs

```typescript
const timerBlock = new MockBlock('countdown-10min', [], { blockType: 'Timer' });
const repBlock = new MockBlock('amrap-20min', [], { blockType: 'AMRAP' });
```

### Test One Scenario Per Test

```typescript
// ✅ Good - focused
it('should initialize timer memory on mount', () => { /* ... */ });
it('should close span on unmount', () => { /* ... */ });

// ❌ Bad - too much in one test
it('should mount timer then tick and complete and output', () => { /* ... */ });
```

---

## Debugging Tips

### Inspect Compilation History

```typescript
console.log('Calls:', harness.mockJit.compileCalls);
console.log('Last:', harness.mockJit.lastCompileCall?.result);
console.log('IDs:', harness.mockJit.getCompiledStatementIds());
```

### Check Action Flow (ExecutionContextTestHarness)

```typescript
console.log('Actions:', harness.actionExecutions.map(e => ({
  type: e.action.type,
  turn: e.turnId,
  iteration: e.iteration
})));
```

### Check Action Flow (BehaviorTestHarness)

```typescript
console.log('Captured:', harness.capturedActions.map(c => ({
  type: c.action.type,
  phase: c.phase,
  timestamp: c.timestamp
})));
```

### Verify Clock State

```typescript
console.log('Clock now:', harness.clock.now);
console.log('Timestamps:', harness.actionExecutions.map(e => e.timestamp));
```

### Check Stack State

```typescript
console.log('Stack depth:', harness.stack.count);      // ExecutionContext
console.log('Stack depth:', harness.stackDepth);       // BehaviorTestHarness
console.log('Current:', harness.currentBlock?.key.toString());
```

### Check Block Memory

```typescript
const block = harness.currentBlock as MockBlock;
console.log('Memory types:', block.getMemoryTypes());
console.log('Timer:', block.getMemory('timer')?.value);
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/testing/harness/ExecutionContextTestHarness.ts` | Full runtime harness with action/event recording |
| `src/testing/harness/BehaviorTestHarness.ts` | Lightweight behavior isolation harness |
| `src/testing/harness/WorkoutTestHarness.ts` | End-to-end workout simulation |
| `src/testing/harness/MockBlock.ts` | `MockBlock`, `MockBlockContext`, `MockBehaviorContext`, `MockMemoryEntry` |
| `src/testing/harness/MockJitCompiler.ts` | Extends `JitCompiler` with recording + matchers |
| `src/testing/harness/ExecutionContextTestBuilder.ts` | Fluent builder for `ExecutionContextTestHarness` |
| `src/testing/harness/RuntimeTestBuilder.ts` | `RuntimeTestHarness` + `RuntimeTestBuilder` |
| `src/testing/harness/factory.ts` | Pre-configured factory functions |
| `src/testing/testable/TestableBlock.ts` | Spy wrapper for real blocks |
| `src/testing/testable/TestableRuntime.ts` | Spy wrapper for real runtime |
| `src/testing/setup/` | Declarative memory setup actions |
| `src/runtime/behaviors/__tests__/integration/test-helpers.ts` | Integration test utilities |

---

**Remember**: The key to good scenario-based tests is:
1. **Clear setup** — Configure what you expect to happen
2. **Explicit execution** — Trigger the behavior you're testing
3. **Specific expectations** — Assert exactly what should have happened
