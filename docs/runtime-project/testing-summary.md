# Runtime Project - Testing Summary

> **Last Updated:** 2026-01-29  
> **Test Status:** 502 pass | 7 skip | 0 fail

---

## Overview

The runtime simplification project uses a **three-tier testing strategy**:

| Tier                  | Purpose                                        | Location                                       | Count |
| --------------------- | ---------------------------------------------- | ---------------------------------------------- | ----- |
| **Unit Tests**        | Test individual behaviors in isolation         | `src/runtime/behaviors/__tests__/`             | ~100  |
| **Integration Tests** | Test behavior compositions (EMOM, AMRAP, etc.) | `src/runtime/behaviors/__tests__/integration/` | ~50   |
| **Hook Tests**        | Test React hooks with mock blocks              | `src/runtime/hooks/__tests__/`                 | ~30   |

---

## Test Framework

- **Framework:** `bun:test` (Bun's native test runner)
- **Mocking:** `vi.fn()` from `bun:test` (Vitest-compatible)
- **React Testing:** `@testing-library/react` for hooks

### Running Tests

```bash
# All unit tests
bun run test

# Behavior tests only
bun test src/runtime/behaviors/__tests__ --preload ./tests/unit-setup.ts

# Integration tests only  
bun test src/runtime/behaviors/__tests__/integration --preload ./tests/unit-setup.ts

# Hook tests only
bun test src/runtime/hooks --preload ./tests/unit-setup.ts

# Memory implementation tests
bun test src/runtime/memory/__tests__ --preload ./tests/unit-setup.ts
```

---

## Classes Under Test

### 1. Aspect-Based Behaviors

These are the core runtime behaviors organized by concern:

| Class | Aspect | What It Does |
|-------|--------|--------------|
| `TimerInitBehavior` | Time | Initializes timer state in block memory |
| `TimerTickBehavior` | Time | Updates timer state on tick events |
| `TimerCompletionBehavior` | Time | Marks block complete when timer expires |
| `TimerPauseBehavior` | Time | Handles pause/resume events |
| `RoundInitBehavior` | Iteration | Initializes round counter |
| `RoundAdvanceBehavior` | Iteration | Increments round on `next()` |
| `RoundCompletionBehavior` | Iteration | Marks complete when rounds exhausted |
| `PopOnNextBehavior` | Completion | Marks complete on user advance |
| `PopOnEventBehavior` | Completion | Marks complete on specific events |
| `DisplayInitBehavior` | Display | Sets display mode and label |
| `ChildRunnerBehavior` | Children | Pushes child blocks |

### 2. Memory Implementations

| Class            | Purpose                       | Key Methods                        |
| ---------------- | ----------------------------- | ---------------------------------- |
| `TimerMemory`    | Stores timer state with spans | `start()`, `stop()`, `subscribe()` |
| `RoundMemory`    | Stores round counter          | `next()`, `reset()`, `subscribe()` |
| `FragmentMemory` | Stores inherited fragments    | `addFragment()`, `clear()`         |

### 3. React Hooks

| Hook | Returns | Updates |
|------|---------|---------|
| `useBlockMemory<T>` | Memory value | On memory change |
| `useTimerState` | `TimerState` | On timer update |
| `useRoundState` | `RoundState` | On round change |
| `useTimerDisplay` | Formatted time | 60fps animation |
| `useRoundDisplay` | Formatted round | On advance |

### 4. Runtime Core

| Class | Purpose |
|-------|---------|
| `ScriptRuntime` | Main execution engine |
| `RuntimeStack` | Observable block stack |
| `BehaviorContext` | Context passed to behaviors |

---

## Testing Strategy by Tier

### Tier 1: Unit Tests (Behavior Isolation)

**Strategy:** Test each behavior's lifecycle methods (`onMount`, `onNext`, `onUnmount`) with a **mock context**.

**Mock Context Pattern:**
```typescript
function createMockContext(): IBehaviorContext {
    const memoryStore = new Map<string, any>();
    
    return {
        block: { key: { toString: () => 'test-block' }, label: 'Test Block' },
        clock: { now: new Date(1000) },
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type) => memoryStore.get(type)),
        setMemory: vi.fn((type, value) => memoryStore.set(type, value)),
    } as unknown as IBehaviorContext;
}
```

**What We Assert:**
- Memory is set with expected values
- Events are emitted with correct data
- `markComplete()` is called at right time
- Event subscriptions are registered

---

### Tier 2: Integration Tests (Behavior Composition)

**Strategy:** Test multiple behaviors working together in realistic workout patterns.

**Mock Runtime/Block Pattern:**
```typescript
// Mock runtime tracks events, outputs, and completion
interface MockRuntime {
    clock: MockClock;
    events: Array<{ name: string; data: unknown }>;
    outputs: Array<{ type: string; fragments: unknown[] }>;
    completionReason: string | undefined;
    subscriptions: Map<string, Function[]>;
}

// Mock block stores memory
interface MockBlock {
    memory: Map<MemoryType, unknown>;
    label: string;
}
```

**Integration Helpers:**
```typescript
mountBehaviors(behaviors, runtime, block)   // Calls onMount on all
advanceBehaviors(behaviors, ctx)            // Calls onNext on all
unmountBehaviors(behaviors, ctx)            // Calls onUnmount on all
simulateTicks(runtime, ctx, count, interval) // Simulates tick events
findEvents(runtime, 'timer:started')        // Query emitted events
findOutputs(runtime, 'milestone')           // Query emitted outputs
expectMemoryState(block, 'round', { current: 2 }) // Assert memory
```

---

### Tier 3: Hook Tests (React Integration)

**Strategy:** Test hooks with `@testing-library/react` using mock blocks.

**Mock Memory Entry Pattern:**
```typescript
class MockMemoryEntry {
    private listeners = new Set<(val, old) => void>();
    private _value: any;
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    update(newValue) {
        const oldValue = this._value;
        this._value = newValue;
        for (const listener of this.listeners) {
            listener(newValue, oldValue);
        }
    }
}
```

---

## Example Tests with Sample Data

### Example 1: TimerInitBehavior Unit Test

**File:** `src/runtime/behaviors/__tests__/AspectBehaviors.test.ts`

**Input:**
```typescript
const behavior = new TimerInitBehavior({
    direction: 'down',
    durationMs: 30000,
    label: 'Work Timer'
});
```

**Action:**
```typescript
behavior.onMount(ctx);
```

**Expected Output:**
```typescript
expect(ctx.setMemory).toHaveBeenCalledWith('timer', {
    direction: 'down',
    durationMs: 30000,
    label: 'Work Timer',
    spans: expect.any(Array),
    role: 'primary'
});

expect(ctx.emitEvent).toHaveBeenCalledWith({
    name: 'timer:started',
    timestamp: expect.any(Date),
    data: { direction: 'down', durationMs: 30000 }
});
```

---

### Example 2: Round Completion Integration Test

**File:** `src/runtime/behaviors/__tests__/integration/loop-block.test.ts`

**Input:** Composition of round behaviors with 3 total rounds
```typescript
const behaviors = [
    new RoundInitBehavior({ totalRounds: 3, startRound: 1 }),
    new RoundAdvanceBehavior(),
    new RoundCompletionBehavior(),
];
```

**Initial Memory State:**
```typescript
{ round: { current: 1, total: 3 } }
```

**Actions:**
```typescript
mountBehaviors(behaviors, runtime, block);    // Round 1
advanceBehaviors(behaviors, ctx);              // Round 2
advanceBehaviors(behaviors, ctx);              // Round 3
advanceBehaviors(behaviors, ctx);              // Round 4 > 3 → complete!
```

**Expected Output:**
```typescript
// Memory after advances
expect(block.memory.get('round')).toEqual({ current: 4, total: 3 });

// Completion triggered
expect(runtime.completionReason).toBe('rounds-complete');

// Events emitted (one per advance)
expect(findEvents(runtime, 'round:advance').length).toBe(3);
```

---

### Example 3: Countdown Timer Expiry

**File:** `src/runtime/behaviors/__tests__/integration/timer-block.test.ts`

**Input:** 5-second countdown timer
```typescript
const behaviors = [
    new TimerInitBehavior({ direction: 'down', durationMs: 5000, label: 'Countdown' }),
    new TimerTickBehavior(),
    new TimerCompletionBehavior(),
];
```

**Actions:** Mount then simulate 6 seconds of ticks
```typescript
const ctx = mountBehaviors(behaviors, runtime, block);
simulateTicks(runtime, ctx, 6, 1000);  // 6 ticks at 1 second each
```

**Expected Output:**
```typescript
// Timer expired at 5 seconds, marked complete
expect(runtime.completionReason).toBe('timer-expired');

// timer:complete event was emitted
expect(findEvents(runtime, 'timer:complete').length).toBeGreaterThanOrEqual(1);
```

---

### Example 4: Memory Subscription in Hooks

**File:** `src/runtime/hooks/__tests__/useBlockMemory.test.ts`

**Input:** Block with timer memory
```typescript
const timerState: TimerState = {
    spans: [new TimeSpan(5000, 8000)],  // 3 seconds elapsed
    direction: 'down',
    durationMs: 60000,
    label: 'Countdown',
    role: 'primary'
};
const block = createMockBlock(new Map([['timer', timerState]]));
```

**Action:** Render hook
```typescript
const { result } = renderHook(() => useTimerDisplay(block));
```

**Expected Output:**
```typescript
expect(result.current).toEqual({
    elapsed: 3000,          // 8000 - 5000 = 3 seconds
    remaining: 57000,       // 60000 - 3000 = 57 seconds
    isRunning: false,       // span is closed (ended !== undefined)
    isComplete: false,      // remaining > 0
    direction: 'down',
    formatted: '0:57'       // Shows remaining for countdown
});
```

---

### Example 5: TimerMemory Unit Test

**File:** `src/runtime/memory/__tests__/MemoryEntries.test.ts`

**Input:** Create timer memory
```typescript
const timer = new TimerMemory({ 
    direction: 'down', 
    label: 'Test', 
    durationMs: 60000 
});
const listener = vi.fn();
timer.subscribe(listener);
```

**Action:** Start the timer
```typescript
timer.start(1000);  // Start at timestamp 1000ms
```

**Expected Output:**
```typescript
// Timer is now running
expect(timer.isRunning).toBe(true);

// A span was added
expect(timer.value.spans.length).toBe(1);
expect(timer.value.spans[0].started).toBe(1000);

// Subscriber was notified with old and new values
expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({ spans: expect.any(Array) }),  // new value
    expect.objectContaining({ spans: [] })                   // old value
);
```

---

## Test File Inventory

### Behavior Unit Tests
| File | Tests |
|------|-------|
| `AspectBehaviors.test.ts` | Timer, Round, Display, Completion behaviors |

### Integration Tests
| File | Pattern Tested |
|------|----------------|
| `timer-block.test.ts` | Countdown/countup timers |
| `loop-block.test.ts` | Round tracking, bounded/unbounded |
| `amrap-pattern.test.ts` | Timer + unbounded rounds |
| `emom-pattern.test.ts` | Interval timer + bounded rounds |
| `edge-cases.test.ts` | Zero duration, rapid advances, etc. |
| `performance.test.ts` | Throughput and memory benchmarks |

### Hook Tests
| File | Hooks Tested |
|------|--------------|
| `useBlockMemory.test.ts` | All memory hooks |

### Memory Tests
| File | Classes Tested |
|------|----------------|
| `MemoryEntries.test.ts` | TimerMemory, RoundMemory, FragmentMemory |
| `RuntimeStack.test.ts` | Observable stack subscription |

### Runtime Tests
| File | Classes Tested |
|------|----------------|
| `BehaviorContext.test.ts` | Context API |
| `OutputStatementEmission.test.ts` | Output subscription |
| `RuntimeBlockLifecycle.test.ts` | Block mount/unmount |

---

## Key Testing Patterns

### 1. Mock Context for Unit Tests
Create lightweight mock that tracks calls to `setMemory`, `emitEvent`, `markComplete`.

### 2. Mock Runtime for Integration Tests
Full mock with clock control, event tracking, and subscription dispatch.

### 3. Composition Over Inheritance
Behaviors are tested by composing them together, mimicking real workout blocks.

### 4. Deterministic Time
All time-based tests use `MockClock` with explicit `advance()` calls.

### 5. State Assertions
Use `expectMemoryState()` to verify block memory matches expected shape.

---

## Coverage Summary

| Area | Coverage |
|------|----------|
| Behaviors (19 classes) | ✅ All tested |
| Memory (3 classes) | ✅ All tested |
| Hooks (6 hooks) | ✅ All tested |
| Workout Patterns | ✅ EMOM, AMRAP, Timer, Loop |
| Edge Cases | ✅ Zero duration, rapid input, pause/resume |
| Performance | ✅ Throughput benchmarks |
