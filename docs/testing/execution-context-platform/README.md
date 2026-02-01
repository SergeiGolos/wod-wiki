# ExecutionContext Testing Platform

A comprehensive testing infrastructure for validating runtime execution behavior with precise control over JIT compilation, time, and action/event recording.

## Quick Start

### Installation

The testing platform is available in the `@/testing/harness` module:

```typescript
import {
  ExecutionContextTestBuilder,
  ExecutionContextTestHarness,
  createTimerTestHarness,
  createBehaviorTestHarness,
  MockBlock
} from '@/testing/harness';
```

### Basic Example

```typescript
import { describe, it, expect, afterEach } from 'bun:test';
import { createTimerTestHarness } from '@/testing/harness';

describe('Timer Execution', () => {
  let harness;

  afterEach(() => harness?.dispose());

  it('should execute and record actions', () => {
    harness = createTimerTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z')
    });

    harness.executeAction({ 
      type: 'start-timer', 
      do: () => { /* timer logic */ }
    });

    harness.advanceClock(5000);

    expect(harness.wasActionExecuted('start-timer')).toBe(true);
    expect(harness.clock.now.getTime()).toBe(
      new Date('2024-01-01T12:00:05Z').getTime()
    );
  });
});
```

---

## Core Components

### 1. ExecutionContextTestHarness

Main test harness with action/event recording and clock control.

**Use When**: Testing ExecutionContext behavior, action queueing, or event handling.

```typescript
import { ExecutionContextTestHarness } from '@/testing/harness';

const harness = new ExecutionContextTestHarness({
  clockTime: new Date('2024-01-01T12:00:00Z'),
  maxDepth: 20
});

harness.executeAction({ type: 'test', do: () => {} });

expect(harness.actionExecutions).toHaveLength(1);
expect(harness.actionExecutions[0].turnId).toBe(1);
```

### 2. ExecutionContextTestBuilder

Fluent builder API for zero-boilerplate test setup.

**Use When**: Setting up complex test scenarios with multiple configurations.

```typescript
import { ExecutionContextTestBuilder, MockBlock } from '@/testing/harness';

const timerBlock = new MockBlock('timer', []);

const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .withMaxDepth(20)
  .whenTextContains('10:00', timerBlock)
  .withBlocks(timerBlock)
  .build();
```

### 3. MockJitCompiler

Mock JIT compiler with predicate-based block matching.

**Use When**: Testing compilation logic or controlling which blocks are returned.

```typescript
const harness = new ExecutionContextTestBuilder()
  .whenCompiling(
    (stmts) => stmts.some(s => s.hasFragment('timer')),
    new MockBlock('timer', [])
  )
  .build();

const result = harness.mockJit.compile(statements, harness.runtime);
expect(harness.mockJit.compileCalls).toHaveLength(1);
```

### 4. Factory Methods

Pre-configured harness creation for common scenarios.

| Factory | Use Case |
|---------|----------|
| `createTimerTestHarness()` | Timer behavior testing |
| `createBehaviorTestHarness()` | Behavior isolation |
| `createCompilationTestHarness()` | JIT compilation testing |
| `createBasicTestHarness()` | Minimal setup |
| `createEventTestHarness()` | Event handler testing |

```typescript
import { createBehaviorTestHarness } from '@/testing/harness';

const behavior = new TimerBehavior('up');
const harness = createBehaviorTestHarness(behavior);

// Behavior is on stack and ready to test
```

---

## Common Patterns

### Testing Turn-Based Execution

```typescript
it('should track turns correctly', () => {
  const harness = createBasicTestHarness();

  harness.executeAction({ type: 'action-1', do: () => {} });
  harness.executeAction({ type: 'action-2', do: () => {} });

  expect(harness.getActionsByTurn(1)[0].action.type).toBe('action-1');
  expect(harness.getActionsByTurn(2)[0].action.type).toBe('action-2');
});
```

### Testing Clock Freezing

```typescript
it('should freeze clock during turn', () => {
  const harness = createBasicTestHarness();
  let time1, time2;

  harness.executeAction({
    type: 'test',
    do: (runtime) => {
      time1 = runtime.clock.now;
      runtime.do({
        type: 'nested',
        do: (rt) => { time2 = rt.clock.now; }
      });
    }
  });

  expect(time1.getTime()).toBe(time2.getTime());
});
```

### Testing Recursion Limits

```typescript
it('should enforce max depth', () => {
  const harness = new ExecutionContextTestBuilder()
    .withMaxDepth(5)
    .build();

  const recursive = { 
    type: 'loop', 
    do: (rt) => rt.do(recursive) 
  };

  expect(() => harness.executeAction(recursive))
    .toThrow(/Max iterations/);
});
```

### Convenience Methods

```typescript
// Push and mount in one call
harness.pushAndMount(block);

// Execute and advance clock
harness.executeAndAdvance(action, 5000);

// Assert action count
harness.expectActionCount('tick', 10);

// Get last action of type
const lastTick = harness.getLastAction('tick');
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](./api-reference.md) | Complete API documentation |
| [Migration Guide](./migration-guide.md) | Migrate from legacy patterns |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

### Implementation Details

| Phase | Description |
|-------|-------------|
| [Phase 1: MockJitCompiler](./phase-1-mock-jit-compiler.md) | JIT compiler mocking |
| [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md) | Main harness |
| [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md) | Builder and factories |

---

## Performance

- **Action recording**: ~0.5-1ms overhead per action
- **Event recording**: ~0.1ms overhead
- **Clock operations**: < 0.1ms
- **Memory**: ~500 bytes per ActionExecution

**Recommendation**: Call `clearRecordings()` between tests:

```typescript
afterEach(() => harness.clearRecordings());
```

---

## Import Summary

```typescript
import {
  // Main harness
  ExecutionContextTestHarness,
  
  // Builder
  ExecutionContextTestBuilder,
  
  // Factories
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness,
  
  // Mock utilities
  MockJitCompiler,
  MockBlock,
  
  // Types
  type ActionExecution,
  type EventDispatch,
  type HarnessConfig,
  type CompileCall
} from '@/testing/harness';
```
