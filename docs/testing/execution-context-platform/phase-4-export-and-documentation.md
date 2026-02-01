# Phase 4: Export & Documentation

**Duration**: 15 minutes  
**Priority**: Medium  
**Dependencies**: Phases 1-3 (All previous components)

## Overview

Finalize the ExecutionContext Testing Platform by creating comprehensive documentation, usage guides, and ensuring all components are properly exported. This phase focuses on developer adoption and long-term maintainability.

## Goals

- ✅ Comprehensive usage guide with real-world examples
- ✅ API reference documentation
- ✅ Migration guide from existing test patterns
- ✅ Troubleshooting guide for common issues
- ✅ Final export verification and TypeScript checks
- ✅ Update main testing documentation index

## File Structure

```
docs/testing/
├── execution-context-platform/
│   ├── README.md                           # NEW - Main usage guide
│   ├── api-reference.md                    # NEW - Complete API docs
│   ├── migration-guide.md                  # NEW - From old patterns
│   ├── troubleshooting.md                  # NEW - Common issues
│   ├── phase-1-mock-jit-compiler.md        # Existing
│   ├── phase-2-execution-context-test-harness.md  # Existing
│   └── phase-3-builder-and-helpers.md      # Existing
tests/harness/
├── index.ts                                # VERIFY - All exports correct
└── README.md                               # NEW - Quick reference
```

## Documentation Content

### 1. Main Usage Guide (README.md)

```markdown
# ExecutionContext Testing Platform

A comprehensive testing infrastructure for validating runtime execution behavior with precise control over JIT compilation, time, and action/event recording.

## Quick Start

### Installation

The testing platform is available in the `@/testing/harness` module:

```typescript
import {
  ExecutionContextTestBuilder,
  createTimerTestHarness,
  ExecutionContextTestHarness
} from '@/testing/harness';
```

### Basic Example

```typescript
import { describe, it, expect } from 'bun:test';
import { createTimerTestHarness } from '@/testing/harness';
import { NextEvent } from '@/runtime/events';

describe('Timer Execution', () => {
  it('should execute timer countdown', () => {
    const harness = createTimerTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z')
    });

    // Execute timer setup
    harness.executeAction({ type: 'start-timer', do: (rt) => {
      // timer logic
    }});

    // Advance time
    harness.advanceClock(5000);

    // Dispatch event
    harness.dispatchEvent(new NextEvent());

    // Assert on recordings
    expect(harness.wasActionExecuted('start-timer')).toBe(true);
    expect(harness.actionExecutions.length).toBeGreaterThan(0);
  });
});
```

## Core Components

### 1. MockJitCompiler

Mock JIT compiler with predicate-based block matching.

**Use When**: Testing compilation logic or needing precise control over which blocks are created

**Example**:
```typescript
import { ExecutionContextTestBuilder } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';

const timerBlock = new MockBlock('timer', [/* behaviors */]);

const harness = new ExecutionContextTestBuilder()
  .whenTextContains('10:00', timerBlock)
  .build();

// Compilation will return timerBlock when text contains '10:00'
const result = harness.mockJit.compile(
  [{ source: '10:00 Run', index: 0 }],
  harness.runtime
);
```

**See**: [Phase 1: MockJitCompiler](./phase-1-mock-jit-compiler.md)

### 2. ExecutionContextTestHarness

Main test harness with action/event recording and clock control.

**Use When**: Testing ExecutionContext turn-based execution, action queueing, or event handling

**Example**:
```typescript
import { ExecutionContextTestHarness } from '@/testing/harness';

const harness = new ExecutionContextTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 20
});

harness.executeAction({ type: 'test', do: () => {} });

// Query recordings
const actions = harness.getActionsByType('test');
expect(actions).toHaveLength(1);
expect(actions[0].iteration).toBe(1);
expect(actions[0].turnId).toBe(1);
```

**See**: [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)

### 3. ExecutionContextTestBuilder

Fluent builder API for zero-boilerplate test setup.

**Use When**: Setting up complex test scenarios with multiple configurations

**Example**:
```typescript
import { ExecutionContextTestBuilder } from '@/testing/harness';

const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .withMaxDepth(20)
  .whenTextContains('10:00', timerBlock)
  .withBlocks(block1, block2)
  .onEvent('next', nextHandler)
  .build();
```

**See**: [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md)

### 4. Factory Methods

Pre-configured harness creation for common scenarios.

**Available Factories**:
- `createTimerTestHarness()` - Timer behavior testing
- `createBehaviorTestHarness()` - Behavior isolation testing
- `createCompilationTestHarness()` - JIT compilation testing
- `createBasicTestHarness()` - Minimal setup
- `createEventTestHarness()` - Event handler testing

**Example**:
```typescript
import { createBehaviorTestHarness } from '@/testing/harness';
import { TimerBehavior } from '@/runtime/behaviors';

const behavior = new TimerBehavior('up');
const harness = createBehaviorTestHarness(behavior);

// Behavior is already mounted and ready to test
harness.executeAction({ type: 'start', do: () => {} });
```

## Common Patterns

### Testing Turn-Based Execution

```typescript
it('should track turns correctly', () => {
  const harness = createBasicTestHarness();

  // Turn 1
  harness.executeAction({ type: 'action-1', do: () => {} });
  
  // Turn 2
  harness.executeAction({ type: 'action-2', do: () => {} });

  const turn1Actions = harness.getActionsByTurn(1);
  const turn2Actions = harness.getActionsByTurn(2);

  expect(turn1Actions[0].action.type).toBe('action-1');
  expect(turn2Actions[0].action.type).toBe('action-2');
});
```

### Testing Clock Freezing

```typescript
it('should freeze clock during execution', () => {
  const harness = createBasicTestHarness();

  const action: IRuntimeAction = {
    type: 'test',
    do: (runtime) => {
      const time1 = runtime.clock.now;
      runtime.do({ type: 'nested', do: (rt) => {
        const time2 = rt.clock.now;
        expect(time1.getTime()).toBe(time2.getTime());
      }});
    }
  };

  harness.executeAction(action);
});
```

### Testing Event Chains

```typescript
it('should track event-triggered actions', () => {
  const harness = createEventTestHarness({
    'timer:complete': {
      id: 'complete',
      name: 'Complete',
      handler: () => [{ type: 'next-block', do: () => {} }]
    }
  });

  harness.dispatchEvent({
    name: 'timer:complete',
    timestamp: new Date()
  });

  expect(harness.wasEventDispatched('timer:complete')).toBe(true);
  expect(harness.wasActionExecuted('next-block')).toBe(true);
});
```

### Testing Recursion Limits

```typescript
it('should enforce max depth', () => {
  const harness = new ExecutionContextTestBuilder()
    .withMaxDepth(5)
    .build();

  const recursiveAction: IRuntimeAction = {
    type: 'recursive',
    do: (runtime) => runtime.do(recursiveAction)
  };

  expect(() => {
    harness.executeAction(recursiveAction);
  }).toThrow(/Max iterations/);

  // Verify exact number of iterations
  expect(harness.actionExecutions).toHaveLength(5);
});
```

## API Reference

See [API Reference](./api-reference.md) for complete API documentation.

## Migration Guide

Migrating from existing test patterns? See [Migration Guide](./migration-guide.md).

## Troubleshooting

Common issues and solutions: [Troubleshooting Guide](./troubleshooting.md)

## Performance

- **Action recording**: ~0.5-1ms overhead per action
- **Event recording**: Minimal overhead (~0.1ms)
- **Clock operations**: < 0.1ms
- **Memory**: ~500 bytes per ActionExecution, ~300 bytes per EventDispatch

**Recommendation**: Call `clearRecordings()` between tests to prevent memory buildup.

## Contributing

When adding new test harness features:

1. Add to appropriate phase documentation
2. Update API reference
3. Add usage examples
4. Update migration guide if replacing old patterns
5. Add troubleshooting entry for common issues

## Related Documentation

- [Phase 1: MockJitCompiler](./phase-1-mock-jit-compiler.md)
- [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)
- [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md)
- [Runtime API Documentation](../runtime-api.md)
- [Block Isolation Testing Guide](../block_isolation_testing_guide.md)
```

### 2. API Reference (api-reference.md)

```markdown
# API Reference: ExecutionContext Testing Platform

Complete API documentation for all testing platform components.

## ExecutionContextTestHarness

### Constructor

```typescript
constructor(config?: HarnessConfig)
```

**Parameters**:
- `config.clockTime?: Date` - Initial clock time (default: current time)
- `config.maxDepth?: number` - Max ExecutionContext iterations (default: 20)
- `config.strategies?: IRuntimeBlockStrategy[]` - JIT strategies to register

**Example**:
```typescript
const harness = new ExecutionContextTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 50,
  strategies: [new TimerStrategy()]
});
```

### Properties

#### `runtime: ScriptRuntime`
The ScriptRuntime instance being tested.

#### `mockJit: MockJitCompiler`
The mock JIT compiler instance.

#### `clock: MockClock`
Controllable test clock.

#### `stack: RuntimeStack`
Runtime stack instance.

#### `eventBus: EventBus`
Event bus instance.

#### `actionExecutions: readonly ActionExecution[]`
Array of all recorded action executions.

**Returns**: Immutable copy of action execution records

#### `eventDispatches: readonly EventDispatch[]`
Array of all recorded event dispatches.

**Returns**: Immutable copy of event dispatch records

### Execution Methods

#### `executeAction(action: IRuntimeAction): void`
Execute an action and record execution details.

**Example**:
```typescript
harness.executeAction({
  type: 'test',
  do: (runtime) => {
    // action logic
  }
});
```

#### `dispatchEvent(event: IEvent): void`
Dispatch an event and record dispatch details.

**Example**:
```typescript
harness.dispatchEvent({
  name: 'next',
  timestamp: new Date()
});
```

### Query Methods

#### `getActionsByType(type: string): ActionExecution[]`
Filter action executions by action type.

**Returns**: Array of matching action executions

#### `wasActionExecuted(type: string): boolean`
Check if action was executed at least once.

**Returns**: `true` if action was executed, `false` otherwise

#### `getActionsByTurn(turnId: number): ActionExecution[]`
Filter action executions by turn ID.

**Returns**: Array of actions executed in specified turn

#### `getEventsByName(name: string): EventDispatch[]`
Filter event dispatches by event name.

**Returns**: Array of matching event dispatches

#### `wasEventDispatched(name: string): boolean`
Check if event was dispatched at least once.

**Returns**: `true` if event was dispatched, `false` otherwise

### Time Control Methods

#### `advanceClock(ms: number): this`
Advance mock clock by milliseconds.

**Returns**: `this` for fluent chaining

**Example**:
```typescript
harness.advanceClock(5000).advanceClock(3000);
```

#### `setClock(time: Date): this`
Set mock clock to specific time.

**Returns**: `this` for fluent chaining

### Cleanup Methods

#### `clearRecordings(): void`
Clear all recordings and reset turn/iteration counters.

**Note**: Does NOT dispose runtime - call `dispose()` separately

#### `dispose(): void`
Dispose runtime and cleanup resources.

### Convenience Methods

#### `pushAndMount(block: IRuntimeBlock): this`
Push block to stack and mount in one call.

**Example**:
```typescript
harness.pushAndMount(timerBlock);
```

#### `executeAndAdvance(action: IRuntimeAction, ms: number): this`
Execute action and advance clock by milliseconds.

#### `dispatchAndGetActions(event: IEvent): IRuntimeAction[]`
Dispatch event and return resulting actions.

**Returns**: Array of actions triggered by event

#### `expectActionCount(type: string, count: number): void`
Assert action was executed exactly N times.

**Throws**: Error if count doesn't match

#### `expectActionAtIteration(type: string, iteration: number): void`
Assert action was executed at specific iteration.

**Throws**: Error if action not found at iteration

#### `getLastAction(type: string): ActionExecution | undefined`
Get most recent execution of action type.

**Returns**: Last action execution or `undefined`

#### `nextTurn(): this`
Advance to next turn (simulates separate `do()` call).

## ExecutionContextTestBuilder

### Configuration Methods

#### `withClock(time: Date): this`
Set initial clock time.

#### `withMaxDepth(depth: number): this`
Set max ExecutionContext iterations.

#### `withStrategies(...strategies: IRuntimeBlockStrategy[]): this`
Register JIT compilation strategies.

### JIT Matcher Methods

#### `whenCompiling(predicate: BlockMatcher, block: IRuntimeBlock | (() => IRuntimeBlock)): this`
Configure MockJitCompiler to return block when predicate matches.

**Parameters**:
- `predicate: (statements, runtime) => boolean` - Matcher function
- `block` - Block or factory function

#### `whenTextContains(substring: string, block: IRuntimeBlock | (() => IRuntimeBlock)): this`
Return block when statement text contains substring.

#### `whenStatements(indices: number[], block: IRuntimeBlock | (() => IRuntimeBlock)): this`
Return block for specific statement indices.

### Setup Methods

#### `withBlocks(...blocks: IRuntimeBlock[]): this`
Push blocks to stack before harness is built.

#### `onEvent(eventName: string, handler: EventHandler, ownerId?: string): this`
Register event handler.

### Build Method

#### `build(): ExecutionContextTestHarness`
Build harness with all configurations applied.

## MockJitCompiler

### Methods

#### `whenMatches(predicate: BlockMatcher, block: IRuntimeBlock | (() => IRuntimeBlock)): this`
Configure block to return when predicate matches.

#### `whenTextContains(substring: string, block: IRuntimeBlock | (() => IRuntimeBlock)): this`
Configure block to return when text contains substring.

#### `withDefaultBlock(block: IRuntimeBlock): this`
Set fallback block when no matchers match.

#### `compile(statements: CodeStatement[], runtime: ScriptRuntime): IRuntimeBlock`
Compile statements to block (calls real JitCompiler if no matches).

#### `clearCalls(): void`
Clear compilation call history.

### Properties

#### `compileCalls: readonly CompileCall[]`
Array of all compilation calls.

#### `lastCompileCall: CompileCall | undefined`
Most recent compilation call.

## Factory Functions

### `createTimerTestHarness(config?)`
Create harness for timer behavior testing.

**Config**:
- `clockTime?: Date`
- `timerDuration?: number`

### `createBehaviorTestHarness(behavior, config?)`
Create harness with behavior pre-loaded.

**Parameters**:
- `behavior: IRuntimeBehavior`

**Config**:
- `clockTime?: Date`
- `maxDepth?: number`

### `createCompilationTestHarness(strategies, config?)`
Create harness for JIT compilation testing.

**Parameters**:
- `strategies: IRuntimeBlockStrategy[]`

**Config**:
- `clockTime?: Date`

### `createBasicTestHarness(config?)`
Create minimal harness.

**Config**:
- `clockTime?: Date`
- `maxDepth?: number`
- `withTimerBlock?: boolean`
- `withLoopBlock?: boolean`

### `createEventTestHarness(handlers, config?)`
Create harness with event handlers.

**Parameters**:
- `handlers: Record<string, EventHandler>`

**Config**:
- `clockTime?: Date`

## Types

### `ActionExecution`
```typescript
interface ActionExecution {
  action: IRuntimeAction;
  timestamp: Date;
  iteration: number;  // 1-indexed
  turnId: number;     // Increments per do() call
}
```

### `EventDispatch`
```typescript
interface EventDispatch {
  event: IEvent;
  timestamp: Date;
  resultingActions: IRuntimeAction[];
  turnId: number;
}
```

### `CompileCall`
```typescript
interface CompileCall {
  statements: CodeStatement[];
  runtime: ScriptRuntime;
  result: IRuntimeBlock;
  timestamp: Date;
}
```

### `BlockMatcher`
```typescript
type BlockMatcher = (
  statements: CodeStatement[],
  runtime: ScriptRuntime
) => boolean;
```
```

### 3. Migration Guide (migration-guide.md)

```markdown
# Migration Guide: Moving to ExecutionContext Testing Platform

Guide for migrating from existing test patterns to the new ExecutionContext Testing Platform.

## From BehaviorTestHarness

### Before
```typescript
import { BehaviorTestHarness } from '@/testing/harness';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01'));

const block = new MockBlock('test', [behavior]);
harness.push(block);
harness.mount();
```

### After
```typescript
import { createBehaviorTestHarness } from '@/testing/harness';

const harness = createBehaviorTestHarness(behavior, {
  clockTime: new Date('2024-01-01')
});
```

**Benefits**:
- Less boilerplate
- Automatic block creation and mounting
- Full ExecutionContext integration

## From RuntimeTestBuilder

### Before
```typescript
import { RuntimeTestBuilder } from '@/testing/harness';

const harness = new RuntimeTestBuilder()
  .withScript('10:00 Run')
  .withStrategy(new TimerStrategy())
  .build();
```

### After
```typescript
import { ExecutionContextTestBuilder } from '@/testing/harness';

const timerBlock = new MockBlock('timer', []);

const harness = new ExecutionContextTestBuilder()
  .whenTextContains('10:00', timerBlock)
  .withStrategies(new TimerStrategy())
  .build();
```

**Benefits**:
- Action/event recording
- Precise control over JIT compilation
- Turn and iteration tracking

## From Manual ScriptRuntime Creation

### Before
```typescript
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { WodScript } from '@/parser/WodScript';

const script = new WodScript('', []);
const runtime = new ScriptRuntime(script, jitCompiler, {
  stack: new RuntimeStack(),
  clock: createMockClock(),
  eventBus: new EventBus()
});
```

### After
```typescript
import { createBasicTestHarness } from '@/testing/harness';

const harness = createBasicTestHarness();
// Access via: harness.runtime, harness.stack, harness.clock, etc.
```

**Benefits**:
- All components pre-configured
- Mock JIT compiler included
- Recording infrastructure built-in

## From Custom Test Mocks

### Before
```typescript
let actionLog: IRuntimeAction[] = [];

const customAction = {
  type: 'test',
  do: (runtime) => {
    actionLog.push(customAction);
    // test logic
  }
};

runtime.do(customAction);

expect(actionLog).toContainEqual(customAction);
```

### After
```typescript
import { createBasicTestHarness } from '@/testing/harness';

const harness = createBasicTestHarness();

harness.executeAction({
  type: 'test',
  do: () => {
    // test logic
  }
});

expect(harness.wasActionExecuted('test')).toBe(true);
expect(harness.actionExecutions[0].iteration).toBe(1);
```

**Benefits**:
- No manual action logging
- Built-in timestamp tracking
- Turn/iteration tracking

## Common Migration Scenarios

### Scenario 1: Testing Clock Behavior

**Before**:
```typescript
const clock = createMockClock(new Date());
let executionTime: Date | null = null;

const action = {
  type: 'test',
  do: (runtime) => {
    executionTime = runtime.clock.now;
  }
};

runtime.do(action);
clock.advance(5000);
```

**After**:
```typescript
const harness = createBasicTestHarness();

harness.executeAction({
  type: 'test',
  do: () => {}
});

harness.advanceClock(5000);

const timestamp = harness.actionExecutions[0].timestamp;
```

### Scenario 2: Testing Event Handling

**Before**:
```typescript
let handlerCalled = false;

eventBus.register('test', {
  id: 'test',
  name: 'Test',
  handler: () => {
    handlerCalled = true;
    return [];
  }
}, 'owner');

runtime.handle({ name: 'test', timestamp: new Date() });

expect(handlerCalled).toBe(true);
```

**After**:
```typescript
const harness = createEventTestHarness({
  'test': {
    id: 'test',
    name: 'Test',
    handler: () => []
  }
});

harness.dispatchEvent({ name: 'test', timestamp: new Date() });

expect(harness.wasEventDispatched('test')).toBe(true);
```

### Scenario 3: Testing JIT Compilation

**Before**:
```typescript
const jit = new JitCompiler([new TimerStrategy()]);
const result = jit.compile([statement], runtime);

expect(result.blockType).toBe('Timer');
```

**After**:
```typescript
const harness = new ExecutionContextTestBuilder()
  .withStrategies(new TimerStrategy())
  .build();

const result = harness.mockJit.compile([statement], harness.runtime);

expect(result.blockType).toBe('Timer');
expect(harness.mockJit.compileCalls).toHaveLength(1);
```

## Migration Checklist

When migrating a test file:

- [ ] Replace manual runtime creation with factory/builder
- [ ] Replace custom action logging with harness recordings
- [ ] Replace manual clock manipulation with `advanceClock()` / `setClock()`
- [ ] Replace manual event tracking with `wasEventDispatched()`
- [ ] Remove custom mock infrastructure
- [ ] Update assertions to use harness query methods
- [ ] Verify turn/iteration tracking works as expected
- [ ] Add `clearRecordings()` in `afterEach()` if needed
- [ ] Add `harness.dispose()` in `afterAll()` or `afterEach()`

## Breaking Changes

### None (Additive Only)

The ExecutionContext Testing Platform is additive - existing test patterns continue to work. Migration is recommended but not required.

## Need Help?

- Check [Troubleshooting Guide](./troubleshooting.md) for common issues
- Review [API Reference](./api-reference.md) for detailed method documentation
- See [Main README](./README.md) for usage examples
```

### 4. Troubleshooting Guide (troubleshooting.md)

```markdown
# Troubleshooting Guide: ExecutionContext Testing Platform

Common issues and solutions when using the testing platform.

## Actions Not Being Recorded

**Symptom**: `harness.actionExecutions` is empty after executing actions

**Causes**:
1. Calling `runtime.do()` directly instead of `harness.executeAction()`
2. Action throws error before recording
3. Cleared recordings before checking

**Solutions**:
```typescript
// ❌ Wrong - bypasses recording
harness.runtime.do(action);

// ✅ Correct - uses harness method
harness.executeAction(action);
```

## Turn IDs Not Incrementing

**Symptom**: All actions have same `turnId` value

**Cause**: All actions executed within same `do()` call (recursive execution)

**Solution**:
```typescript
// This creates ONE turn with multiple iterations
harness.executeAction({
  type: 'first',
  do: (rt) => {
    rt.do({ type: 'second', do: () => {} });
  }
});

// This creates TWO turns
harness.executeAction({ type: 'first', do: () => {} });
harness.executeAction({ type: 'second', do: () => {} });

// Or use helper
harness.executeAction({ type: 'first', do: () => {} });
harness.nextTurn();
harness.executeAction({ type: 'second', do: () => {} });
```

## Clock Not Freezing During Execution

**Symptom**: Timestamps differ within same turn

**Cause**: Using real Date() instead of `runtime.clock.now`

**Solution**:
```typescript
// ❌ Wrong - uses system time
const action = {
  type: 'test',
  do: () => {
    const time = new Date(); // System time, not frozen
  }
};

// ✅ Correct - uses runtime clock
const action = {
  type: 'test',
  do: (runtime) => {
    const time = runtime.clock.now; // Frozen during turn
  }
};
```

## MockJitCompiler Not Matching

**Symptom**: JIT compiler returns unexpected blocks or falls through to real compiler

**Cause**: Predicates not matching correctly

**Debug Steps**:
1. Check predicate logic
2. Verify statement structure
3. Check matcher priority (first match wins)

**Solutions**:
```typescript
// Debug: Log what's being compiled
harness.mockJit.whenMatches((statements, runtime) => {
  console.log('Compiling:', statements);
  return statements.some(s => s.source?.includes('10:00'));
}, timerBlock);

// Check compilation history
console.log(harness.mockJit.compileCalls);

// Verify last compilation result
console.log(harness.mockJit.lastCompileCall?.result);
```

## Memory Leaks in Test Suite

**Symptom**: Tests slow down over time or run out of memory

**Cause**: Recordings accumulate across tests

**Solution**:
```typescript
import { describe, it, beforeEach, afterEach } from 'bun:test';

describe('My Tests', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = createBasicTestHarness();
  });

  afterEach(() => {
    harness.clearRecordings(); // Clear recordings
    harness.dispose();         // Clean up resources
  });

  it('test 1', () => {
    // ...
  });

  it('test 2', () => {
    // ...
  });
});
```

## Events Not Triggering Actions

**Symptom**: `harness.wasEventDispatched()` returns `true` but no actions executed

**Cause**: Event handlers not registered or not returning actions

**Solutions**:
```typescript
// Verify handler returns actions
const handler = {
  id: 'test',
  name: 'Test',
  handler: () => {
    return [{ // Must return array of actions
      type: 'result',
      do: () => {}
    }];
  }
};

// Verify handler is registered
harness.eventBus.register('event-name', handler, 'owner');

// Check resulting actions
const dispatch = harness.eventDispatches.find(e => e.event.name === 'event-name');
console.log('Resulting actions:', dispatch?.resultingActions);
```

## Max Iterations Error

**Symptom**: Test throws "Max iterations exceeded" error

**Cause**: Recursive action execution without termination condition

**Solutions**:
```typescript
// 1. Increase max depth for legitimate deep recursion
const harness = new ExecutionContextTestBuilder()
  .withMaxDepth(100)
  .build();

// 2. Add termination condition
let count = 0;
const recursiveAction: IRuntimeAction = {
  type: 'recursive',
  do: (runtime) => {
    if (count++ < 10) { // Terminate after 10 iterations
      runtime.do(recursiveAction);
    }
  }
};

// 3. Test the error is thrown as expected
expect(() => {
  harness.executeAction(recursiveAction);
}).toThrow(/Max iterations/);
```

## TypeScript Errors with Builder API

**Symptom**: TypeScript errors when using fluent builder methods

**Cause**: Missing type imports or incorrect method chaining

**Solutions**:
```typescript
// Ensure all types are imported
import {
  ExecutionContextTestBuilder,
  type HarnessConfig
} from '@/testing/harness';

// Use 'as const' for fixed arrays
builder.whenStatements([1, 2, 3] as const, block);

// Explicit type for event handlers
const handler: EventHandler = {
  id: 'test',
  name: 'Test',
  handler: () => []
};
```

## Factory Functions Not Working

**Symptom**: Factory functions throw errors or create incomplete harnesses

**Cause**: Missing dependencies or incorrect config

**Debug**:
```typescript
// Check what's being created
const harness = createTimerTestHarness();
console.log('Runtime:', harness.runtime);
console.log('MockJit:', harness.mockJit);
console.log('Clock:', harness.clock.now);
console.log('Stack depth:', harness.stack.depth);
```

## Convenience Methods Undefined

**Symptom**: `harness.pushAndMount is not a function`

**Cause**: Using old version of ExecutionContextTestHarness

**Solution**:
1. Verify Phase 3 implementation is complete
2. Check imports are from correct module
3. Rebuild project: `bun install`

## Performance Issues

**Symptom**: Tests run slowly with harness

**Causes & Solutions**:

1. **Too many recordings**:
```typescript
// Clear recordings periodically in long tests
afterEach(() => {
  harness.clearRecordings();
});
```

2. **Deep recursion with recording**:
```typescript
// Use lower maxDepth for recursive tests
const harness = new ExecutionContextTestBuilder()
  .withMaxDepth(10) // Reduce from default 20
  .build();
```

3. **Inefficient assertions**:
```typescript
// ❌ Slow - filters on every assertion
for (let i = 0; i < 100; i++) {
  expect(harness.wasActionExecuted(`action-${i}`)).toBe(true);
}

// ✅ Fast - filter once
const executedTypes = new Set(harness.actionExecutions.map(e => e.action.type));
for (let i = 0; i < 100; i++) {
  expect(executedTypes.has(`action-${i}`)).toBe(true);
}
```

## Getting Help

If you encounter issues not covered here:

1. Check [API Reference](./api-reference.md) for method signatures
2. Review [Main README](./README.md) for usage examples
3. Check implementation phase docs for detailed behavior:
   - [Phase 1: MockJitCompiler](./phase-1-mock-jit-compiler.md)
   - [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)
   - [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md)
4. Search existing tests in `tests/harness/__tests__/` for examples
```

## Implementation Steps

### Step 1: Create Documentation Files (10 min)

1. Create `docs/testing/execution-context-platform/README.md` (main usage guide)
2. Create `docs/testing/execution-context-platform/api-reference.md`
3. Create `docs/testing/execution-context-platform/migration-guide.md`
4. Create `docs/testing/execution-context-platform/troubleshooting.md`
5. Add cross-references between all documentation files

### Step 2: Create Harness README (3 min)

1. Create `tests/harness/README.md` with quick reference
2. Link to full documentation
3. Include import examples

```markdown
# Test Harness

Testing infrastructure for WOD Wiki runtime components.

## Quick Reference

```typescript
import {
  // Phase 1: MockJitCompiler
  MockJitCompiler,

  // Phase 2: ExecutionContextTestHarness
  ExecutionContextTestHarness,

  // Phase 3: Builder & Factories
  ExecutionContextTestBuilder,
  createTimerTestHarness,
  createBehaviorTestHarness,

  // Existing
  MockBlock,
  BehaviorTestHarness
} from '@/testing/harness';
```

## Full Documentation

See [ExecutionContext Testing Platform](../../docs/testing/execution-context-platform/README.md)

## Components

- **MockJitCompiler**: Mock JIT compiler with predicate matching
- **ExecutionContextTestHarness**: Main harness with action/event recording
- **ExecutionContextTestBuilder**: Fluent builder API
- **Factory Functions**: Pre-configured harness creators

## Example

```typescript
import { createTimerTestHarness } from '@/testing/harness';

const harness = createTimerTestHarness();
harness.executeAction({ type: 'test', do: () => {} });
expect(harness.wasActionExecuted('test')).toBe(true);
```
```

### Step 3: Verify Exports (2 min)

1. Check `tests/harness/index.ts` exports all components
2. Verify no circular dependencies
3. Test imports in sample file

```typescript
// Verification script: tests/harness/__tests__/exports.test.ts
import { describe, it, expect } from 'bun:test';

describe('Harness Exports', () => {
  it('should export all Phase 1 components', async () => {
    const { MockJitCompiler } = await import('@/testing/harness');
    expect(MockJitCompiler).toBeDefined();
  });

  it('should export all Phase 2 components', async () => {
    const { ExecutionContextTestHarness } = await import('@/testing/harness');
    expect(ExecutionContextTestHarness).toBeDefined();
  });

  it('should export all Phase 3 components', async () => {
    const {
      ExecutionContextTestBuilder,
      createTimerTestHarness,
      createBehaviorTestHarness,
      createCompilationTestHarness,
      createBasicTestHarness,
      createEventTestHarness
    } = await import('@/testing/harness');

    expect(ExecutionContextTestBuilder).toBeDefined();
    expect(createTimerTestHarness).toBeDefined();
    expect(createBehaviorTestHarness).toBeDefined();
    expect(createCompilationTestHarness).toBeDefined();
    expect(createBasicTestHarness).toBeDefined();
    expect(createEventTestHarness).toBeDefined();
  });

  it('should export existing components', async () => {
    const {
      MockBlock,
      BehaviorTestHarness,
      RuntimeTestBuilder
    } = await import('@/testing/harness');

    expect(MockBlock).toBeDefined();
    expect(BehaviorTestHarness).toBeDefined();
    expect(RuntimeTestBuilder).toBeDefined();
  });
});
```

### Step 4: Update Main Testing Docs (Optional)

Update `docs/testing/README.md` or similar to reference new platform:

```markdown
## Test Harnesses

### ExecutionContext Testing Platform (New!)

Comprehensive testing infrastructure for runtime execution behavior.

- **MockJitCompiler**: Control JIT compilation in tests
- **ExecutionContextTestHarness**: Record actions and events
- **Builder API**: Zero-boilerplate test setup

[📚 Full Documentation](./execution-context-platform/README.md)

### Legacy Harnesses

- **BehaviorTestHarness**: Behavior isolation testing
- **RuntimeTestBuilder**: Basic runtime setup

[Migration Guide](./execution-context-platform/migration-guide.md)
```

## Acceptance Criteria

- ✅ Main README created with quick start and examples
- ✅ API reference created with all methods documented
- ✅ Migration guide created for all legacy patterns
- ✅ Troubleshooting guide created with common issues
- ✅ Quick reference README in tests/harness/
- ✅ All documentation cross-referenced
- ✅ Export verification test passes
- ✅ No TypeScript errors
- ✅ Documentation links validated with `bun run docs:check`
- ✅ All code examples in documentation are syntactically correct

## Validation Checklist

### Documentation Quality
- [ ] All code examples are syntactically correct
- [ ] All internal links work (`bun run docs:check`)
- [ ] API reference covers all public methods
- [ ] Migration guide covers all legacy patterns
- [ ] Troubleshooting covers common issues from testing

### Export Verification
- [ ] Export test passes: `bun test tests/harness/__tests__/exports.test.ts`
- [ ] No circular dependencies
- [ ] All types exported correctly
- [ ] IntelliSense works for all imports

### Integration
- [ ] Can import all components from `@/testing/harness`
- [ ] Factory functions work in test files
- [ ] Builder API has full IntelliSense support
- [ ] Documentation examples can be copy-pasted and work

## Example Documentation Index

Final documentation structure:

```
docs/testing/execution-context-platform/
├── README.md                              # Main entry point
├── api-reference.md                       # Complete API docs
├── migration-guide.md                     # Legacy → new platform
├── troubleshooting.md                     # Common issues
├── phase-1-mock-jit-compiler.md          # Implementation guide
├── phase-2-execution-context-test-harness.md
└── phase-3-builder-and-helpers.md
```

## Completion Checklist

- [ ] `docs/testing/execution-context-platform/README.md` created
- [ ] `docs/testing/execution-context-platform/api-reference.md` created
- [ ] `docs/testing/execution-context-platform/migration-guide.md` created
- [ ] `docs/testing/execution-context-platform/troubleshooting.md` created
- [ ] `tests/harness/README.md` created
- [ ] `tests/harness/__tests__/exports.test.ts` created
- [ ] All cross-references added between documentation files
- [ ] All code examples validated
- [ ] Export test passes
- [ ] Documentation link validation passes: `bun run docs:check`
- [ ] Main testing docs updated (if applicable)
- [ ] No TypeScript errors: `bun x tsc --noEmit`

## Related Files

- **Depends On**: All previous phases
- **Updates**: `docs/testing/README.md` (if exists)
- **Creates**: 5 new documentation files

---

**Status**: 📝 Ready for implementation  
**Previous Phase**: [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md)  
**Completes**: ExecutionContext Testing Platform implementation

