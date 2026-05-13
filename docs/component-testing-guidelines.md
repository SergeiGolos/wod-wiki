# Component Testing Guidelines

## Overview

This document provides comprehensive guidelines for testing components and behaviors in the WOD Wiki codebase. These guidelines ensure consistent, high-quality tests that are maintainable and meaningful.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Harness Selection](#test-harness-selection)
3. [Testing Patterns](#testing-patterns)
4. [Test Structure](#test-structure)
5. [Assertion Guidelines](#assertion-guidelines)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## Testing Philosophy

### Quality Over Quantity

- **Meaningful assertions only**: Every test should assert meaningful behavior, not implementation details
- **≥3 assertions per test average**: Tests should verify multiple aspects of behavior
- **Test behavior, not implementation**: Focus on what the component does, not how it does it
- **Realistic test data**: Use realistic inputs and edge cases, not just minimal data

### Test-Driven Development (TDD)

**IMPORTANT**: Always write tests BEFORE implementation (RED phase).

- Write failing tests first based on requirements
- Ensure tests actually fail (validate they catch missing implementation)
- Pass failing tests to Core Developer for GREEN phase
- Never write tests after implementation (circular validation)

### Multi-Layer Validation

Every test suite must include:

1. **Happy Path Tests**: Normal inputs and typical use cases
2. **Edge Cases**: Boundary values, empty/null inputs, special characters
3. **Error Cases**: Invalid inputs, exception conditions, error propagation
4. **Meta-Testing**: Tests should pass on known good code, fail on known bad code

## Test Harness Selection

### BehaviorTestHarness

**Use for**: Testing individual behaviors in isolation

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01T12:00:00Z'));

const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
harness.push(block);
harness.mount();
```

**When to use**:
- Unit testing single behaviors
- Testing event subscriptions and emissions
- Testing memory operations
- Isolated behavior logic testing

### ExecutionContextTestHarness

**Use for**: Testing execution context and strategy interactions

```typescript
import { ExecutionContextTestHarness } from '@/testing/harness';

const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .withMaxDepth(20)
  .build();
```

**When to use**:
- Testing JIT compilation with strategies
- Testing action execution
- Testing event handlers
- Integration testing with real event bus

### Factory Functions

**Use for**: Quick setup of common test scenarios

```typescript
import {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
  createEventTestHarness
} from '@/testing/harness';

// Timer testing
const harness = createTimerTestHarness({ clockTime: new Date('2024-01-01T12:00:00Z') });

// Behavior testing
const behavior = new TimerBehavior('up');
const harness = createBehaviorTestHarness(behavior);

// Compilation testing
const harness = createCompilationTestHarness([new TimerStrategy()]);
```

## Testing Patterns

### Pattern 1: Behavior Lifecycle Testing

Test the complete lifecycle of a behavior:

```typescript
describe('TimerBehavior', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => { harness?.dispose(); });

  it('initializes timer state on mount', () => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));

    const block = new MockBlock('test-timer', [
      new CountdownTimerBehavior({ durationMs: 30000 })
    ]);

    harness.push(block);
    harness.mount();

    // Assert memory was pushed via recordings
    const pushCalls = block.recordings!.pushMemory;
    expect(pushCalls.length).toBeGreaterThanOrEqual(1);

    const timePush = pushCalls.find(c => c.tag === 'time');
    expect(timePush).toBeDefined();

    const timerValue = timePush!.metrics[0]?.value as any;
    expect(timerValue.direction).toBe('down');
    expect(timerValue.durationMs).toBe(30000);
  });
});
```

### Pattern 2: Event Subscription Testing

Test that behaviors subscribe to correct events:

```typescript
it('subscribes to tick, reset, pause and resume events on mount', () => {
  harness = new BehaviorTestHarness()
    .withClock(new Date('2024-01-01T12:00:00Z'));

  const block = new MockBlock('test-timer', [
    new CountdownTimerBehavior({ durationMs: 30000 })
  ]);

  harness.push(block);
  harness.mount();

  const subscribeCalls = block.recordings!.subscribe;
  expect(subscribeCalls).toHaveLength(4);

  expect(subscribeCalls.some(c => c.eventType === 'tick')).toBe(true);

  // Verify subscription scope
  const tickSub = subscribeCalls.find(c => c.eventType === 'tick');
  expect(tickSub!.options?.scope).toBe('bubble');
});
```

### Pattern 3: Time-Based Testing

Test time-dependent behaviors:

```typescript
it('tracks elapsed time correctly', () => {
  harness = new BehaviorTestHarness()
    .withClock(new Date('2024-01-01T12:00:00Z'));

  const block = new MockBlock('test-timer', [
    new CountdownTimerBehavior({ durationMs: 30000 })
  ]);

  harness.push(block);
  harness.mount();

  // Advance time and verify
  harness.advanceClock(5000);

  const timeMemory = block.getMemoryByTag('time');
  const timerValue = timeMemory[0].metrics[0]?.value as any;

  expect(timerValue.remainingMs).toBeLessThan(30000);
});
```

### Pattern 4: Memory Testing

Test memory operations and state management:

```typescript
it('allocates and updates memory correctly', () => {
  harness = new BehaviorTestHarness();

  const block = new MockBlock('test-block', [
    new TestBehavior()
  ]);

  harness.push(block);
  harness.mount();

  // Verify memory allocation
  const pushCalls = block.recordings!.pushMemory;
  expect(pushCalls.length).toBeGreaterThan(0);

  // Trigger state change
  harness.next();

  // Verify memory update
  const updateCalls = block.recordings!.updateMemory;
  expect(updateCalls.length).toBeGreaterThan(0);
});
```

### Pattern 5: Error Handling Testing

Test error conditions and edge cases:

```typescript
it('handles invalid inputs gracefully', () => {
  harness = new BehaviorTestHarness();

  const block = new MockBlock('test-block', [
    new TestBehavior()
  ]);

  harness.push(block);
  harness.mount();

  // Test with invalid input
  expect(() => {
    block.setMemoryValue('test', null as any);
  }).not.toThrow();

  // Verify error state
  const errorMemory = block.getMemory('error');
  expect(errorMemory?.value).toBeDefined();
});
```

## Test Structure

### Standard Test File Structure

```typescript
import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { YourBehavior } from '../YourBehavior';

describe('YourBehavior', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => {
    harness?.dispose();
  });

  describe('mount phase', () => {
    it('should initialize required state', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);

      // Act
      harness.push(block);
      harness.mount();

      // Assert
      expect(block.recordings!.pushMemory.length).toBeGreaterThan(0);
    });
  });

  describe('next phase', () => {
    it('should process lifecycle correctly', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act
      const actions = harness.next();

      // Assert
      expect(actions).toBeDefined();
    });
  });

  describe('unmount phase', () => {
    it('should clean up resources', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act
      harness.unmount();

      // Assert
      const updateCalls = block.recordings!.updateMemory;
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', () => {
      // Test error conditions
    });
  });
});
```

## Assertion Guidelines

### Use Recording-Based Assertions

When testing behaviors, use the `recordings` property from MockBlock:

```typescript
// GOOD - Use recordings
const pushCalls = block.recordings!.pushMemory;
expect(pushCalls.find(c => c.tag === 'time')).toBeDefined();

// AVOID - Direct implementation inspection
expect(block.behaviors[0].initialized).toBe(true);
```

### Multiple Assertions Per Test

Write tests that verify multiple aspects:

```typescript
it('initializes timer state completely', () => {
  harness.push(block);
  harness.mount();

  const timePush = block.recordings!.pushMemory.find(c => c.tag === 'time');
  const timerValue = timePush!.metrics[0]?.value as any;

  // Multiple related assertions
  expect(timerValue.direction).toBe('down');
  expect(timerValue.durationMs).toBe(30000);
  expect(timerValue.label).toBe('Work');
  expect(timerValue.spans).toHaveLength(1);
  expect(timerValue.spans[0].started).toEqual(expect.any(Number));
});
```

### Test Event Emissions

Verify that behaviors emit correct events:

```typescript
it('emits completion event when timer ends', () => {
  harness.push(block);
  harness.mount();

  // Trigger completion
  harness.advanceClock(30000);

  // Verify event was emitted
  expect(harness.wasEventEmitted('timer:complete')).toBe(true);

  const events = harness.findEvents('timer:complete');
  expect(events[0].data).toMatchObject({
    durationMs: 30000,
    reason: 'expired'
  });
});
```

## Anti-Patterns to Avoid

### ❌ Tautological Tests

Tests that always pass:

```typescript
// BAD - This always passes
it('works correctly', () => {
  const result = add(1, 1);
  expect(result).toBe(result);
});

// GOOD - Meaningful assertion
it('adds two numbers correctly', () => {
  const result = add(1, 1);
  expect(result).toBe(2);
});
```

### ❌ Testing Implementation Details

Tests that break on refactoring:

```typescript
// BAD - Tests internal structure
it('uses array to store items', () => {
  expect(component.items instanceof Array).toBe(true);
});

// GOOD - Tests behavior
it('stores items in order', () => {
  component.addItem('first');
  component.addItem('second');
  expect(component.getItem(0)).toBe('first');
  expect(component.getItem(1)).toBe('second');
});
```

### ❌ Over-Mocking

Tests that don't verify real behavior:

```typescript
// BAD - Everything is mocked
it('processes data', () => {
  const mockService = { process: mock() };
  mockService.process.mockReturnValue('mocked');
  const result = component.processData(mockService);
  expect(result).toBe('mocked');
});

// GOOD - Test with real dependencies
it('processes data correctly', () => {
  const service = new RealService();
  const result = component.processData(service);
  expect(result).toEqual(expectedData);
});
```

### ❌ Happy-Path-Only Testing

Tests that only cover success cases:

```typescript
// BAD - Only tests success
it('parses valid input', () => {
  const result = parser.parse('10:00 Run');
  expect(result).toBeDefined();
});

// GOOD - Tests both success and failure
describe('parse', () => {
  it('parses valid input', () => {
    const result = parser.parse('10:00 Run');
    expect(result.durationMs).toBe(600000);
  });

  it('throws on invalid input', () => {
    expect(() => parser.parse('invalid')).toThrow();
  });

  it('handles empty input', () => {
    expect(() => parser.parse('')).toThrow();
  });
});
```

## Coverage Goals

- **Line coverage**: >80%
- **Branch coverage**: >70%
- **Function coverage**: >85%
- **Critical paths**: 100%

Remember: Coverage without quality is failure. 80% of weak tests is not success.

## Resources

- [Test Harness API](/docs/runtime-api.md)
- [Test Templates](/docs/test-templates.md)
- [Storybook Testing Guide](/docs/storybook-testing.md)
- [PR Testing Checklist](/docs/pr-testing-checklist.md)
