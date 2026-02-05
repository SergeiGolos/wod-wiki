# Testing Skill Guide: ExecutionContext Testing Platform

A practical guide for writing tests using the ExecutionContext Testing Platform to validate compiler/JIT behavior and runtime execution with scenario-based testing.

## Overview

This guide focuses on **scenario-based testing** where you:
1. **Set up a scenario** - Configure the test environment with specific blocks and compilation rules
2. **Execute actions** - Trigger compilation and execution behavior
3. **Assert expectations** - Verify the compiler/JIT handled things correctly

## Quick Start Pattern

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';

describe('My Feature', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    // 1. Create harness
    harness = new ExecutionContextTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z'),
      maxDepth: 20
    });
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should handle my scenario', () => {
    // 2. Configure compilation behavior
    const expectedBlock = new MockBlock('my-block', []);
    harness.mockJit.whenTextContains('keyword', expectedBlock);

    // 3. Trigger compilation
    const result = harness.mockJit.compile(
      [{ source: 'keyword statement', index: 0 }],
      harness.runtime
    );

    // 4. Assert expectations
    expect(result).toBe(expectedBlock);
    expect(harness.mockJit.compileCalls).toHaveLength(1);
  });
});
```

## Core Testing Patterns

### Pattern 1: Testing Compilation Matching

**Scenario**: Verify the JIT compiler returns the correct block based on input.

```typescript
describe('JIT Compilation Matching', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should compile timer blocks when text contains duration', () => {
    // Scenario: Timer syntax in statements
    const timerBlock = new MockBlock('timer', []);
    harness.mockJit.whenTextContains('10:00', timerBlock);

    // Execute: Compile a timer statement
    const result = harness.mockJit.compile(
      [{ source: '10:00 Run', index: 0 }],
      harness.runtime
    );

    // Expectations:
    expect(result).toBe(timerBlock);
    expect(result.id).toBe('timer');
    expect(harness.mockJit.compileCalls).toHaveLength(1);
    expect(harness.mockJit.lastCompileCall?.result).toBe(timerBlock);
  });

  it('should compile different blocks based on statement content', () => {
    // Scenario: Multiple compilation patterns
    const timerBlock = new MockBlock('timer', []);
    const repBlock = new MockBlock('rep', []);
    
    harness.mockJit.whenTextContains('10:00', timerBlock);
    harness.mockJit.whenTextContains('3x', repBlock);

    // Execute: Compile different statements
    const result1 = harness.mockJit.compile(
      [{ source: '10:00 Work', index: 0 }],
      harness.runtime
    );
    const result2 = harness.mockJit.compile(
      [{ source: '3x Push-ups', index: 1 }],
      harness.runtime
    );

    // Expectations:
    expect(result1).toBe(timerBlock);
    expect(result2).toBe(repBlock);
    expect(harness.mockJit.compileCalls).toHaveLength(2);
  });

  it('should use custom predicates for complex matching', () => {
    // Scenario: Complex compilation logic
    const complexBlock = new MockBlock('complex', []);
    
    harness.mockJit.whenMatches(
      (statements) => {
        // Custom logic: match when multiple statements with specific pattern
        return statements.length === 2 && 
               statements.some(s => s.source?.includes('FOR TIME'));
      },
      complexBlock
    );

    // Execute: Compile matching statements
    const result = harness.mockJit.compile(
      [
        { source: 'FOR TIME', index: 0 },
        { source: '100 Air Squats', index: 1 }
      ],
      harness.runtime
    );

    // Expectations:
    expect(result).toBe(complexBlock);
  });
});
```

### Pattern 2: Testing Action Execution Flow

**Scenario**: Verify actions execute in the correct order with proper turn/iteration tracking.

```typescript
describe('Action Execution Flow', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should track action execution with turn and iteration', () => {
    // Scenario: Execute actions and verify tracking
    harness.executeAction({ 
      type: 'setup',
      do: () => {} 
    });

    harness.executeAction({ 
      type: 'execute',
      do: () => {} 
    });

    // Expectations:
    expect(harness.actionExecutions).toHaveLength(2);
    expect(harness.actionExecutions[0].action.type).toBe('setup');
    expect(harness.actionExecutions[0].turnId).toBe(1);
    expect(harness.actionExecutions[0].iteration).toBe(1);
    
    expect(harness.actionExecutions[1].action.type).toBe('execute');
    expect(harness.actionExecutions[1].turnId).toBe(2);
    expect(harness.actionExecutions[1].iteration).toBe(1);
  });

  it('should track nested actions within same turn', () => {
    // Scenario: Nested action execution
    harness.executeAction({
      type: 'parent',
      do: (runtime) => {
        runtime.do({
          type: 'child',
          do: () => {}
        });
      }
    });

    // Expectations: Both in same turn, different iterations
    const parentExecution = harness.getActionsByType('parent')[0];
    const childExecution = harness.getActionsByType('child')[0];

    expect(parentExecution.turnId).toBe(childExecution.turnId);
    expect(parentExecution.iteration).toBe(1);
    expect(childExecution.iteration).toBe(2);
  });

  it('should verify action was executed', () => {
    // Scenario: Check if specific actions ran
    harness.executeAction({ type: 'mount-block', do: () => {} });
    harness.executeAction({ type: 'start-timer', do: () => {} });

    // Expectations:
    expect(harness.wasActionExecuted('mount-block')).toBe(true);
    expect(harness.wasActionExecuted('start-timer')).toBe(true);
    expect(harness.wasActionExecuted('not-executed')).toBe(false);
  });
});
```

### Pattern 3: Testing Clock Behavior

**Scenario**: Verify time-based execution and clock freezing.

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
    // Scenario: Clock must be frozen during a turn
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

    // Expectations: All timestamps in same turn are identical
    expect(timestamps[0].getTime()).toBe(timestamps[1].getTime());
    expect(harness.actionExecutions[0].timestamp.getTime())
      .toBe(harness.actionExecutions[1].timestamp.getTime());
  });

  it('should advance time between actions', () => {
    // Scenario: Time advances between separate actions
    harness.executeAction({ type: 'first', do: () => {} });
    
    harness.advanceClock(5000); // Advance 5 seconds
    
    harness.executeAction({ type: 'second', do: () => {} });

    // Expectations: 5 second difference
    const timestamps = harness.actionExecutions.map(e => e.timestamp.getTime());
    expect(timestamps[1] - timestamps[0]).toBe(5000);
  });

  it('should allow setting clock to specific time', () => {
    // Scenario: Jump to specific time for testing
    const targetTime = new Date('2026-01-01T00:00:00Z');
    
    harness.setClock(targetTime);
    harness.executeAction({ type: 'test', do: () => {} });

    // Expectations: Action executed at target time
    expect(harness.actionExecutions[0].timestamp.getTime())
      .toBe(targetTime.getTime());
  });
});
```

### Pattern 4: Testing Event Handling

**Scenario**: Verify events trigger correct actions.

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
    // Scenario: Event handler triggers actions
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
      'test-owner'
    );

    // Execute: Dispatch event
    harness.dispatchEvent({
      name: 'timer:complete',
      timestamp: new Date(),
      data: { elapsed: 10000 }
    });

    // Expectations:
    expect(harness.wasEventDispatched('timer:complete')).toBe(true);
    expect(harness.eventDispatches).toHaveLength(1);
    expect(harness.eventDispatches[0].resultingActions).toHaveLength(1);
    expect(harness.eventDispatches[0].resultingActions[0].type)
      .toBe('advance-to-next');
    
    // Resulting action should also be executed
    expect(harness.wasActionExecuted('advance-to-next')).toBe(true);
  });

  it('should track multiple events in sequence', () => {
    // Scenario: Multiple events dispatched
    harness.dispatchEvent({ name: 'event-1', timestamp: new Date(), data: {} });
    harness.dispatchEvent({ name: 'event-2', timestamp: new Date(), data: {} });
    harness.dispatchEvent({ name: 'event-1', timestamp: new Date(), data: {} });

    // Expectations:
    expect(harness.eventDispatches).toHaveLength(3);
    expect(harness.getEventsByName('event-1')).toHaveLength(2);
    expect(harness.getEventsByName('event-2')).toHaveLength(1);
  });
});
```

### Pattern 5: Testing Compilation + Execution Integration

**Scenario**: End-to-end testing of compilation and execution together.

```typescript
describe('Compilation + Execution Integration', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should compile block and execute mount action', () => {
    // Scenario: Compile block, push to stack, mount
    const timerBlock = new MockBlock('timer', []);
    harness.mockJit.whenTextContains('10:00', timerBlock);

    // Execute: Compile
    const compiled = harness.mockJit.compile(
      [{ source: '10:00 Run', index: 0 }],
      harness.runtime
    );

    // Push to stack
    harness.stack.push(compiled);

    // Mount the block
    harness.executeAction({
      type: 'mount',
      do: (runtime) => {
        compiled.mount(runtime);
      }
    });

    // Expectations:
    expect(harness.mockJit.compileCalls).toHaveLength(1);
    expect(harness.stack.current()).toBe(timerBlock);
    expect(harness.wasActionExecuted('mount')).toBe(true);
  });

  it('should handle compilation errors gracefully', () => {
    // Scenario: Compilation might fail or return fallback
    harness.mockJit.whenMatches(() => false, new MockBlock('never', []));

    // Execute: Compile with no matches (falls through to real JitCompiler)
    const result = harness.mockJit.compile(
      [{ source: 'unknown syntax', index: 0 }],
      harness.runtime
    );

    // Expectations: Should still compile (via fallback)
    expect(result).toBeDefined();
    expect(harness.mockJit.compileCalls).toHaveLength(1);
  });
});
```

## Advanced Patterns

### Testing Recursion Limits

```typescript
it('should enforce max iteration depth', () => {
  // Scenario: Prevent infinite recursion
  const harness = new ExecutionContextTestHarness({ maxDepth: 3 });

  let count = 0;
  const recursive: IRuntimeAction = {
    type: 'recursive',
    do: (runtime) => {
      count++;
      runtime.do(recursive); // Infinite recursion
    }
  };

  // Execute: Try to recurse infinitely
  expect(() => {
    harness.executeAction(recursive);
  }).toThrow(/Max iterations/);

  // Expectations: Should stop at max depth
  expect(count).toBe(3);
  harness.dispose();
});
```

### Testing with Factory Functions

```typescript
it('should support dynamic block creation', () => {
  // Scenario: Different blocks each time
  const harness = new ExecutionContextTestHarness();
  
  let callCount = 0;
  harness.mockJit.whenTextContains('timer', () => {
    callCount++;
    return new MockBlock(`timer-${callCount}`, []);
  });

  // Execute: Compile multiple times
  const block1 = harness.mockJit.compile(
    [{ source: 'timer 1', index: 0 }],
    harness.runtime
  );
  const block2 = harness.mockJit.compile(
    [{ source: 'timer 2', index: 1 }],
    harness.runtime
  );

  // Expectations: Different blocks created
  expect(block1.id).toBe('timer-1');
  expect(block2.id).toBe('timer-2');
  expect(block1).not.toBe(block2);
  
  harness.dispose();
});
```

### Testing Cleanup and Isolation

```typescript
describe('Test Isolation', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = new ExecutionContextTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should clear recordings between tests', () => {
    // First test execution
    harness.executeAction({ type: 'test-1', do: () => {} });
    expect(harness.actionExecutions).toHaveLength(1);

    // Clear recordings
    harness.clearRecordings();

    // Expectations: Clean slate
    expect(harness.actionExecutions).toHaveLength(0);
    expect(harness.eventDispatches).toHaveLength(0);
    expect(harness.mockJit.compileCalls).toHaveLength(0);

    // Second test execution
    harness.executeAction({ type: 'test-2', do: () => {} });
    expect(harness.actionExecutions).toHaveLength(1);
    expect(harness.actionExecutions[0].turnId).toBe(1); // Counters reset
  });
});
```

## Common Assertion Patterns

### Checking Compilation Results

```typescript
// Did compilation happen?
expect(harness.mockJit.compileCalls).toHaveLength(expectedCount);

// What was compiled?
expect(harness.mockJit.lastCompileCall?.result.id).toBe('expected-id');

// Check compilation history
const calls = harness.mockJit.compileCalls;
expect(calls[0].statements[0].source).toContain('expected text');
```

### Checking Action Execution

```typescript
// Was action executed?
expect(harness.wasActionExecuted('action-type')).toBe(true);

// How many times?
expect(harness.getActionsByType('action-type')).toHaveLength(count);

// What was the order?
expect(harness.actionExecutions.map(e => e.action.type))
  .toEqual(['first', 'second', 'third']);

// Which turn?
expect(harness.getActionsByTurn(1)).toHaveLength(expectedCount);

// At what iteration?
expect(harness.actionExecutions[0].iteration).toBe(1);
```

### Checking Clock Behavior

```typescript
// Clock at expected time?
expect(harness.clock.now.getTime()).toBe(expectedTime);

// Time difference between actions?
const timestamps = harness.actionExecutions.map(e => e.timestamp.getTime());
expect(timestamps[1] - timestamps[0]).toBe(5000);

// Clock frozen during turn?
const turnActions = harness.getActionsByTurn(1);
const uniqueTimes = new Set(turnActions.map(a => a.timestamp.getTime()));
expect(uniqueTimes.size).toBe(1); // All same time
```

### Checking Event Handling

```typescript
// Was event dispatched?
expect(harness.wasEventDispatched('event-name')).toBe(true);

// What actions resulted?
const dispatch = harness.eventDispatches[0];
expect(dispatch.resultingActions).toHaveLength(expectedCount);
expect(dispatch.resultingActions[0].type).toBe('expected-action');

// Check event data
expect(dispatch.event.data).toEqual({ expected: 'data' });
```

## Real-World Example

Here's a complete test for a timer compilation scenario:

```typescript
describe('Timer Block Compilation', () => {
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

  it('should compile and execute countdown timer', () => {
    // Scenario: Parse "10:00 Run" and execute countdown
    
    // 1. Setup: Configure JIT to return timer block
    const timerBlock = new MockBlock('countdown-timer', []);
    harness.mockJit.whenMatches(
      (statements) => statements.some(s => /\d+:\d+/.test(s.source || '')),
      timerBlock
    );

    // 2. Compile the statement
    const compiled = harness.mockJit.compile(
      [{ source: '10:00 Run', index: 0 }],
      harness.runtime
    );

    // 3. Push and mount
    harness.stack.push(compiled);
    harness.executeAction({
      type: 'mount-timer',
      do: (runtime) => compiled.mount(runtime)
    });

    // 4. Simulate time passing
    harness.advanceClock(5000); // 5 seconds pass

    // 5. Dispatch tick event
    harness.dispatchEvent({
      name: 'timer:tick',
      timestamp: harness.clock.now,
      data: { elapsed: 5000 }
    });

    // Expectations:
    
    // Compilation happened
    expect(harness.mockJit.compileCalls).toHaveLength(1);
    expect(compiled).toBe(timerBlock);
    expect(compiled.id).toBe('countdown-timer');
    
    // Block is on stack
    expect(harness.stack.current()).toBe(timerBlock);
    expect(harness.stack.depth).toBe(1);
    
    // Mount action executed
    expect(harness.wasActionExecuted('mount-timer')).toBe(true);
    
    // Clock advanced
    expect(harness.clock.now.getTime())
      .toBe(new Date('2024-01-01T12:00:05Z').getTime());
    
    // Event dispatched
    expect(harness.wasEventDispatched('timer:tick')).toBe(true);
  });

  it('should handle timer completion', () => {
    // Scenario: Timer completes and triggers next block
    
    const timerBlock = new MockBlock('timer', []);
    harness.mockJit.whenTextContains('10:00', timerBlock);

    // Register completion handler
    harness.eventBus.register(
      'timer:complete',
      {
        id: 'completion',
        name: 'Timer Completion',
        handler: () => [{
          type: 'pop-and-next',
          do: (runtime) => {
            runtime.stack.pop()?.dispose();
          }
        }]
      },
      'timer'
    );

    // Compile and mount
    const block = harness.mockJit.compile(
      [{ source: '10:00 Work', index: 0 }],
      harness.runtime
    );
    harness.stack.push(block);

    // Timer completes
    harness.advanceClock(600000); // 10 minutes
    harness.dispatchEvent({
      name: 'timer:complete',
      timestamp: harness.clock.now,
      data: { duration: 600000 }
    });

    // Expectations:
    
    // Event dispatched
    expect(harness.wasEventDispatched('timer:complete')).toBe(true);
    
    // Cleanup action triggered
    expect(harness.wasActionExecuted('pop-and-next')).toBe(true);
    
    // Stack is empty (block popped)
    expect(harness.stack.depth).toBe(0);
  });
});
```

## Tips and Best Practices

### 1. Always Dispose
```typescript
afterEach(() => {
  harness.dispose(); // Prevent memory leaks
});
```

### 2. Use Descriptive Block IDs
```typescript
const timerBlock = new MockBlock('countdown-10min', []);
const repBlock = new MockBlock('amrap-20min', []);
```

### 3. Clear Recordings for Fresh State
```typescript
it('test 1', () => {
  // ... test code ...
  harness.clearRecordings(); // Clean slate for next part
});
```

### 4. Test One Scenario Per Test
```typescript
// ✅ Good - focused
it('should compile timer blocks', () => { /* ... */ });
it('should execute timer countdown', () => { /* ... */ });

// ❌ Bad - too much in one test
it('should compile and execute timer with events and cleanup', () => { /* ... */ });
```

### 5. Use Fluent Chaining
```typescript
harness
  .advanceClock(5000)
  .setClock(new Date('2024-01-01T12:00:00Z'))
  .advanceClock(1000);
```

### 6. Verify Both Positive and Negative Cases
```typescript
expect(harness.wasActionExecuted('expected')).toBe(true);
expect(harness.wasActionExecuted('not-expected')).toBe(false);
```

## Debugging Tips

### 1. Inspect Compilation History
```typescript
console.log('Compilation calls:', harness.mockJit.compileCalls);
console.log('Last result:', harness.mockJit.lastCompileCall?.result);
```

### 2. Check Action Flow
```typescript
console.log('Actions:', harness.actionExecutions.map(e => ({
  type: e.action.type,
  turn: e.turnId,
  iteration: e.iteration
})));
```

### 3. Verify Clock State
```typescript
console.log('Clock now:', harness.clock.now);
console.log('Action timestamps:', harness.actionExecutions.map(e => e.timestamp));
```

### 4. Check Stack State
```typescript
console.log('Stack depth:', harness.stack.depth);
console.log('Current block:', harness.stack.current()?.id);
```

## Related Documentation

- [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md) - Full API reference
- [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md) - Builder patterns
- [API Reference](./phase-4-export-and-documentation.md) - Complete API documentation
- [Troubleshooting Guide](./phase-4-export-and-documentation.md) - Common issues

---

**Remember**: The key to good scenario-based tests is:
1. **Clear setup** - Configure what you expect to happen
2. **Explicit execution** - Trigger the behavior you're testing
3. **Specific expectations** - Assert exactly what should have happened
