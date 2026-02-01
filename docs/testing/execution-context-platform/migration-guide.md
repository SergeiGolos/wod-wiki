# Migration Guide: ExecutionContext Testing Platform

This guide helps migrate from legacy test patterns to the new ExecutionContext Testing Platform.

## Quick Migration Reference

| Legacy Pattern | New Pattern |
|----------------|-------------|
| Manual ScriptRuntime setup | `createBasicTestHarness()` |
| Custom JIT mocking | `MockJitCompiler` |
| `BehaviorTestHarness` | `createBehaviorTestHarness()` |
| Manual clock control | `harness.advanceClock()` |
| Event spy patterns | `harness.wasEventDispatched()` |

---

## Migration Scenarios

### 1. From Manual ScriptRuntime Setup

#### Before

```typescript
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events/EventBus';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { WodScript } from '@/parser/WodScript';

describe('Timer Tests', () => {
  let runtime: ScriptRuntime;
  let stack: RuntimeStack;
  let eventBus: EventBus;
  let clock: any;

  beforeEach(() => {
    stack = new RuntimeStack();
    eventBus = new EventBus();
    clock = { now: new Date(), advance: (ms) => { /* manual impl */ } };
    
    const script = new WodScript('', []);
    const jit = new JitCompiler([]);
    
    runtime = new ScriptRuntime(script, jit, {
      stack,
      clock,
      eventBus
    });
  });

  afterEach(() => {
    runtime.dispose();
  });

  it('should execute action', () => {
    runtime.do({ type: 'test', do: () => {} });
    // No easy way to verify what happened
  });
});
```

#### After

```typescript
import { createBasicTestHarness } from '@/testing/harness';

describe('Timer Tests', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    harness = createBasicTestHarness();
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should execute action', () => {
    harness.executeAction({ type: 'test', do: () => {} });
    
    // Easy verification
    expect(harness.wasActionExecuted('test')).toBe(true);
    expect(harness.actionExecutions[0].iteration).toBe(1);
  });
});
```

---

### 2. From BehaviorTestHarness

#### Before

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('TimerBehavior', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('should start timer on mount', () => {
    const block = new MockBlock('test-timer', [new TimerBehavior('up')]);
    harness.push(block);
    harness.mount();
    
    expect(block.getBehavior(TimerBehavior)!.isRunning()).toBe(true);
  });
});
```

#### After

```typescript
import { createBehaviorTestHarness } from '@/testing/harness';

describe('TimerBehavior', () => {
  let harness: ExecutionContextTestHarness;

  beforeEach(() => {
    const behavior = new TimerBehavior('up');
    harness = createBehaviorTestHarness(behavior, {
      clockTime: new Date('2024-01-01T12:00:00Z')
    });
  });

  afterEach(() => {
    harness.dispose();
  });

  it('should start timer on mount', () => {
    // Block is already on stack with behavior
    const block = harness.stack.current;
    const behavior = block?.getBehavior(TimerBehavior);
    
    // Mount via action for recording
    harness.executeAction({
      type: 'mount',
      do: (rt) => block?.mount(rt)
    });
    
    expect(behavior?.isRunning()).toBe(true);
    expect(harness.wasActionExecuted('mount')).toBe(true);
  });
});
```

**Note**: `BehaviorTestHarness` is still available and valid for simple behavior isolation tests. Use `createBehaviorTestHarness` when you need action/event recording.

---

### 3. From Custom JIT Mocking

#### Before

```typescript
describe('JIT Compilation', () => {
  it('should compile timer blocks', () => {
    const mockJit = {
      compile: jest.fn().mockReturnValue(new MockBlock('timer', []))
    };

    const runtime = new ScriptRuntime(script, mockJit as any, deps);
    
    // ... test logic
    
    expect(mockJit.compile).toHaveBeenCalled();
  });
});
```

#### After

```typescript
import { ExecutionContextTestBuilder, MockBlock } from '@/testing/harness';

describe('JIT Compilation', () => {
  it('should compile timer blocks', () => {
    const timerBlock = new MockBlock('timer', []);
    
    const harness = new ExecutionContextTestBuilder()
      .whenTextContains('timer', timerBlock)
      .build();

    // Trigger compilation
    const result = harness.mockJit.compile(
      [{ id: 1, fragments: [{ fragmentType: 'timer' }] }] as any,
      harness.runtime
    );

    expect(result).toBe(timerBlock);
    expect(harness.mockJit.compileCalls).toHaveLength(1);
    expect(harness.mockJit.getCompiledStatementIds()).toEqual([1]);
  });
});
```

---

### 4. From Manual Event Handling

#### Before

```typescript
describe('Event Handling', () => {
  it('should handle next event', () => {
    const eventsSeen: string[] = [];
    
    eventBus.on('*', (event) => {
      eventsSeen.push(event.name);
    });

    runtime.handle(new NextEvent());
    
    expect(eventsSeen).toContain('next');
  });
});
```

#### After

```typescript
import { createBasicTestHarness } from '@/testing/harness';
import { NextEvent } from '@/runtime/events';

describe('Event Handling', () => {
  it('should handle next event', () => {
    const harness = createBasicTestHarness();

    harness.dispatchEvent(new NextEvent());

    expect(harness.wasEventDispatched('next')).toBe(true);
    expect(harness.getEventsByName('next')).toHaveLength(1);
  });
});
```

---

### 5. From Manual Clock Control

#### Before

```typescript
describe('Timing Tests', () => {
  let mockTime = new Date('2024-01-01T12:00:00Z');
  
  const clock = {
    get now() { return mockTime; },
    advance(ms: number) { 
      mockTime = new Date(mockTime.getTime() + ms);
    }
  };

  it('should advance time', () => {
    const start = clock.now.getTime();
    clock.advance(5000);
    expect(clock.now.getTime()).toBe(start + 5000);
  });
});
```

#### After

```typescript
import { createTimerTestHarness } from '@/testing/harness';

describe('Timing Tests', () => {
  it('should advance time', () => {
    const harness = createTimerTestHarness({
      clockTime: new Date('2024-01-01T12:00:00Z')
    });

    const start = harness.clock.now.getTime();
    harness.advanceClock(5000);
    
    expect(harness.clock.now.getTime()).toBe(start + 5000);
  });
});
```

---

## Feature Comparison

| Feature | Legacy | New Platform |
|---------|--------|--------------|
| Runtime setup | Manual, 10+ lines | 1 line factory call |
| Clock control | Custom implementation | Built-in `advanceClock()` |
| Action recording | Not available | Full recording with metadata |
| Event recording | Manual spy setup | Built-in tracking |
| JIT mocking | Custom mocks | `MockJitCompiler` with matchers |
| Assertions | Manual checks | Helper methods + query API |
| Turn tracking | Not available | Automatic with `turnId` |
| Iteration counting | Not available | Automatic with `iteration` |

---

## Keeping Both Patterns

You don't have to migrate all tests at once. Both patterns can coexist:

```typescript
// New tests use the platform
import { createTimerTestHarness } from '@/testing/harness';

describe('New Timer Tests', () => {
  it('uses new platform', () => {
    const harness = createTimerTestHarness();
    // ...
  });
});

// Legacy tests continue to work
import { BehaviorTestHarness } from '@/testing/harness';

describe('Legacy Timer Tests', () => {
  it('uses legacy harness', () => {
    const harness = new BehaviorTestHarness();
    // ...
  });
});
```

---

## When to Migrate

**Migrate when**:
- Writing new tests for runtime execution
- Tests need action/event recording
- Tests involve complex timing scenarios
- Tests need to verify turn-based execution

**Keep legacy when**:
- Simple behavior unit tests
- Tests are stable and don't need changes
- Migration effort exceeds benefit

---

## Need Help?

- [API Reference](./api-reference.md) - Complete method documentation
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Main README](./README.md) - Quick start and examples
