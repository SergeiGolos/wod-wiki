# Task: Integration Tests for Multi-Behavior Compositions

> **Status:** ✅ Completed  
> **Completed:** 2026-01-28  
> **Priority:** Medium  
> **Estimated Effort:** 1.5-2 hours

## Overview

Create comprehensive integration tests that verify multi-behavior compositions work correctly together. These tests simulate real runtime scenarios where multiple behaviors coordinate via shared memory.

---

## Prerequisites

- [x] Aspect behaviors implemented
- [x] Unit tests for individual behaviors passing
- [x] Memory types defined in `MemoryTypes.ts`
- [x] Strategy migration complete (can run in parallel)

---

## Test Categories

### Category 1: Timer Block Compositions

Test timer-related behaviors working together.

### Category 2: Loop Block Compositions

Test round/iteration behaviors with child execution.

### Category 3: Hybrid Compositions

Test timer + rounds (EMOM, Tabata, AMRAP patterns).

### Category 4: Edge Cases

Test error handling, empty states, and boundary conditions.

---

## Detailed Task Breakdown

### Task 1: Create Test Infrastructure

**Duration:** 20 min

**File:** `src/runtime/behaviors/__tests__/integration/test-helpers.ts`

**Steps:**
1. [ ] Create `MockRuntime` for integration testing
2. [ ] Create `createTestBlock()` helper
3. [ ] Create `advanceTime()` helper for timer tests
4. [ ] Create `simulateTick()` for tick event dispatch
5. [ ] Create `expectMemoryState()` assertion helper

**Code Pattern:**
```typescript
// test-helpers.ts
export function createTestBlock(config: {
  behaviors: IRuntimeBehavior[];
  initialMemory?: Partial<MemoryTypeMap>;
}): { block: IRuntimeBlock; context: IBehaviorContext; runtime: MockRuntime } {
  // Setup
}

export function simulateTicks(ctx: IBehaviorContext, count: number, intervalMs: number): void {
  // Dispatch tick events
}

export function expectMemoryState<T extends MemoryType>(
  ctx: IBehaviorContext,
  type: T,
  expected: Partial<MemoryTypeMap[T]>
): void {
  // Assert memory matches
}
```

---

### Task 2: Timer Block Integration Tests

**Duration:** 25 min

**File:** `src/runtime/behaviors/__tests__/integration/timer-block.test.ts`

**Test Cases:**

```typescript
describe('Timer Block Integration', () => {
  describe('Countdown Timer', () => {
    it('should initialize timer state on mount');
    it('should close span on unmount');
    it('should mark complete when countdown expires');
    it('should emit timer:complete event on expiry');
    it('should pause timer on timer:pause event');
    it('should resume timer on timer:resume event');
    it('should emit correct elapsed time in output');
  });

  describe('Countup Timer', () => {
    it('should track elapsed time without expiring');
    it('should not mark complete automatically');
  });
});
```

**Behavior Composition Under Test:**
```typescript
const timerBehaviors = [
  new TimerInitBehavior({ direction: 'down', durationMs: 10000 }),
  new TimerTickBehavior(),
  new TimerCompletionBehavior(),
  new TimerPauseBehavior(),
  new DisplayInitBehavior({ mode: 'countdown' }),
  new TimerOutputBehavior()
];
```

---

### Task 3: Loop Block Integration Tests

**Duration:** 25 min

**File:** `src/runtime/behaviors/__tests__/integration/loop-block.test.ts`

**Test Cases:**

```typescript
describe('Loop Block Integration', () => {
  describe('Round Tracking', () => {
    it('should initialize at round 1');
    it('should advance round on next()');
    it('should mark complete when rounds exceed total');
    it('should not complete for unbounded rounds');
    it('should update roundDisplay on each advance');
  });

  describe('Child Execution', () => {
    it('should push first child on mount');
    it('should push next child on next()');
    it('should reset child index on round advance');
    it('should handle empty child groups');
  });

  describe('Output Emission', () => {
    it('should emit milestone on round advance');
    it('should emit completion with correct round count');
    it('should record history on unmount');
  });
});
```

**Behavior Composition Under Test:**
```typescript
const loopBehaviors = [
  new RoundInitBehavior({ totalRounds: 5 }),
  new RoundAdvanceBehavior(),
  new RoundCompletionBehavior(),
  new RoundDisplayBehavior(),
  new ChildRunnerBehavior({ childGroups: [[1], [2], [3]] }),
  new DisplayInitBehavior({ mode: 'clock' }),
  new RoundOutputBehavior(),
  new HistoryRecordBehavior()
];
```

---

### Task 4: EMOM Pattern Integration Tests

**Duration:** 20 min

**File:** `src/runtime/behaviors/__tests__/integration/emom-pattern.test.ts`

**Test Cases:**

```typescript
describe('EMOM Pattern Integration', () => {
  it('should complete each minute interval');
  it('should advance round after minute expires');
  it('should complete workout after all rounds');
  it('should track total elapsed time correctly');
  it('should emit round milestones each minute');
});
```

**Behavior Composition Under Test:**
```typescript
const emomBehaviors = [
  // Timer per minute
  new TimerInitBehavior({ direction: 'down', durationMs: 60000 }),
  new TimerTickBehavior(),
  new TimerCompletionBehavior(),
  // Rounds
  new RoundInitBehavior({ totalRounds: 10 }),
  new RoundAdvanceBehavior(),
  new RoundCompletionBehavior(),
  // Display & Children
  new DisplayInitBehavior({ mode: 'countdown' }),
  new RoundDisplayBehavior(),
  new ChildRunnerBehavior({ childGroups }),
  // Output
  new TimerOutputBehavior(),
  new RoundOutputBehavior()
];
```

---

### Task 5: Tabata Pattern Integration Tests

**Duration:** 20 min

**File:** `src/runtime/behaviors/__tests__/integration/tabata-pattern.test.ts`

**Test Cases:**

```typescript
describe('Tabata Pattern Integration', () => {
  it('should alternate work/rest intervals');
  it('should complete after 8 rounds');
  it('should emit correct sounds at countdown');
  it('should display correct interval type (work/rest)');
});
```

---

### Task 6: AMRAP Pattern Integration Tests

**Duration:** 20 min

**File:** `src/runtime/behaviors/__tests__/integration/amrap-pattern.test.ts`

**Test Cases:**

```typescript
describe('AMRAP Pattern Integration', () => {
  it('should track rounds without limit');
  it('should complete on time cap');
  it('should allow user advance (next) during workout');
  it('should record final round count in history');
});
```

---

### Task 7: Edge Case Tests

**Duration:** 20 min

**File:** `src/runtime/behaviors/__tests__/integration/edge-cases.test.ts`

**Test Cases:**

```typescript
describe('Edge Cases', () => {
  describe('Missing Memory', () => {
    it('should handle missing timer state gracefully');
    it('should handle missing round state gracefully');
    it('should not throw if display not initialized');
  });

  describe('Behavior Order', () => {
    it('should execute init behaviors before subscription behaviors');
    it('should execute output behaviors after state changes');
  });

  describe('Lifecycle Edge Cases', () => {
    it('should clean up subscriptions on unmount');
    it('should handle double-mount gracefully');
    it('should handle unmount without mount');
  });

  describe('Zero/Empty States', () => {
    it('should handle zero duration timer');
    it('should handle zero rounds');
    it('should handle empty child groups');
  });
});
```

---

### Task 8: Performance Tests

**Duration:** 15 min

**File:** `src/runtime/behaviors/__tests__/integration/performance.test.ts`

**Test Cases:**

```typescript
describe('Performance', () => {
  it('should create block with 10 behaviors under 5ms');
  it('should process 1000 tick events under 100ms');
  it('should not leak memory across block lifecycle');
});
```

---

## File Structure

```
src/runtime/behaviors/__tests__/
├── AspectBehaviors.test.ts       # Existing unit tests
└── integration/
    ├── test-helpers.ts           # Shared test utilities
    ├── timer-block.test.ts       # Timer compositions
    ├── loop-block.test.ts        # Loop compositions
    ├── emom-pattern.test.ts      # EMOM hybrid pattern
    ├── tabata-pattern.test.ts    # Tabata hybrid pattern
    ├── amrap-pattern.test.ts     # AMRAP hybrid pattern
    ├── edge-cases.test.ts        # Error handling
    └── performance.test.ts       # Performance benchmarks
```

---

## Verification Checklist

| Check | Command |
|-------|---------|
| Run Integration Tests | `npx vitest run src/runtime/behaviors/__tests__/integration` |
| Full Test Suite | `npx vitest run src/runtime` |
| Coverage Report | `npx vitest run --coverage src/runtime/behaviors` |

---

## Success Criteria

- [ ] All integration test files created
- [ ] Test helpers reusable across test files
- [ ] Coverage > 80% for behavior module
- [ ] No flaky tests (deterministic timing)
- [ ] Tests run in under 5 seconds total
