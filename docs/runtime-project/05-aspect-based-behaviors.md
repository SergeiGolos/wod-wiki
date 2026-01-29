# Aspect-Based Behavior Design

> **Status:** ✅ Implemented  
> **Date:** 2026-01-28 (Updated)

## Overview

This document describes the aspect-based behavior system for composing runtime blocks. The system follows SOLID principles, using stateless behaviors that coordinate via typed block memory.

---

## Design Principles

1. **SOLID Compliance**
   - **S**ingle Responsibility: Each behavior owns one aspect
   - **O**pen-Closed: New implementations via new behaviors, not modification
   - **L**iskov Substitution: Behaviors are interchangeable within aspect category
   - **I**nterface Segregation: Small, focused memory interfaces
   - **D**ependency Inversion: Behaviors depend on memory abstractions, not each other

2. **Stateless Behaviors**: All state lives in block memory (via `ctx.setMemory()`)
3. **Shared Memory**: Behaviors coordinate via typed memory slots
4. **Builder Composition**: Strategies compose blocks by adding aspect behaviors

---

## Implementation Status

| Aspect         | Behaviors   | Status        |
| -------------- | ----------- | ------------- |
| **Time**       | 5 behaviors | ✅ Implemented |
| **Iteration**  | 5 behaviors | ✅ Implemented |
| **Completion** | 4 behaviors | ✅ Implemented |
| **Display**    | 2 behaviors | ✅ Implemented |
| **Children**   | 1 behavior  | ✅ Implemented |
| **Output**     | 4 behaviors | ✅ Implemented |
| **Controls**   | 1 behavior  | ✅ Implemented |

**Total: 22 behaviors implemented**

---

## Aspect Catalog

### 1. Time Aspect

**Purpose:** Track elapsed/remaining time, manage timer state.

#### Memory Model (`TimerState`)

```typescript
interface TimerState {
  /** Timer direction */
  direction: 'up' | 'down';
  
  /** Duration in ms (required for countdown) */
  durationMs?: number;
  
  /** Time spans for pause/resume tracking */
  spans: readonly TimeSpan[];
  
  /** Display label */
  label: string;
  
  /** Role for display priority */
  role?: 'primary' | 'secondary' | 'hidden';
}
```

#### Behavior Implementations

| Behavior                  | File                         | Responsibility                                              |
| ------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `TimerInitBehavior`       | `TimerInitBehavior.ts`       | Initialize timer state on mount, emit `timer:started` event |
| `TimerTickBehavior`       | `TimerTickBehavior.ts`       | Subscribe to tick events, close spans on unmount            |
| `TimerCompletionBehavior` | `TimerCompletionBehavior.ts` | Mark complete on countdown expiry, emit `timer:complete`    |
| `TimerPauseBehavior`      | `TimerPauseBehavior.ts`      | Handle `timer:pause`/`timer:resume` events                  |
| `TimerOutputBehavior`     | `TimerOutputBehavior.ts`     | Emit timer outputs with elapsed time on mount/unmount       |

---

### 2. Iteration Aspect

**Purpose:** Track rounds, child indices, and iteration progress.

#### Memory Model (`RoundState`)

```typescript
interface RoundState {
  /** Current round (1-indexed) */
  current: number;
  
  /** Total rounds (undefined = unbounded) */
  total: number | undefined;
}
```

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `RoundInitBehavior` | `RoundInitBehavior.ts` | Initialize round state on mount |
| `RoundAdvanceBehavior` | `RoundAdvanceBehavior.ts` | Increment round on next(), emit `round:advance` |
| `RoundCompletionBehavior` | `RoundCompletionBehavior.ts` | Mark complete when current > total, emit `rounds:complete` |
| `RoundDisplayBehavior` | `RoundDisplayBehavior.ts` | Update `display.roundDisplay` on iteration |
| `RoundOutputBehavior` | `RoundOutputBehavior.ts` | Emit round milestone/completion outputs |

---

### 3. Completion Aspect

**Purpose:** Detect and signal block completion.

#### Memory Model (`CompletionState`)

```typescript
interface CompletionState {
  /** Whether block is marked complete */
  isComplete: boolean;
  
  /** Reason for completion */
  reason?: 'timer-expired' | 'rounds-complete' | 'user-advance' | 'manual' | string;
  
  /** Timestamp of completion (epoch ms) */
  completedAt?: number;
}
```

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `PopOnNextBehavior` | `PopOnNextBehavior.ts` | Mark complete immediately on next() |
| `PopOnEventBehavior` | `PopOnEventBehavior.ts` | Mark complete when specified event fires |
| `TimerCompletionBehavior` | (Time aspect) | Complete when countdown expires |
| `RoundCompletionBehavior` | (Iteration aspect) | Complete when rounds exceeded |

> **Note:** `ctx.markComplete(reason)` is the unified API for all completion behaviors.

---

### 4. Display Aspect

**Purpose:** Manage UI-facing state (labels, modes, visibility).

#### Memory Model (`DisplayState`)

```typescript
interface DisplayState {
  /** Current display mode */
  mode: 'clock' | 'timer' | 'countdown' | 'hidden';
  
  /** Primary label */
  label: string;
  
  /** Secondary/subtitle label */
  subtitle?: string;
  
  /** Formatted round string (e.g., "Round 2/5") */
  roundDisplay?: string;
  
  /** Exercise/action being performed */
  actionDisplay?: string;
}
```

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `DisplayInitBehavior` | `DisplayInitBehavior.ts` | Initialize display state on mount |
| `RoundDisplayBehavior` | `RoundDisplayBehavior.ts` | Update roundDisplay when rounds change |

---

### 5. Children Aspect

**Purpose:** Manage child block execution order and injection.

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `ChildRunnerBehavior` | `ChildRunnerBehavior.ts` | Push child blocks on mount/next, track index |

> **Note:** Child state is tracked internally by the behavior instance, not in memory.

---

### 6. Output Aspect

**Purpose:** Emit structured outputs for history/analytics.

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `SegmentOutputBehavior` | `SegmentOutputBehavior.ts` | Emit segment on mount, completion on unmount |
| `TimerOutputBehavior` | (Time aspect) | Emit timer-specific outputs with elapsed time |
| `RoundOutputBehavior` | (Iteration aspect) | Emit round milestone outputs |
| `HistoryRecordBehavior` | `HistoryRecordBehavior.ts` | Emit `history:record` event on unmount |
| `SoundCueBehavior` | `SoundCueBehavior.ts` | Emit `sound:play` events at lifecycle/countdown points |

---

### 7. Controls Aspect

**Purpose:** Manage UI buttons and user interactions.

#### Behavior Implementations

| Behavior | File | Responsibility |
|----------|------|---------------|
| `ControlsInitBehavior` | `ControlsInitBehavior.ts` | Initialize button configs, emit `controls:init` |

---

## Memory Type Registry

Registered memory types in `MemoryTypes.ts`:

```typescript
type MemoryType = 'timer' | 'round' | 'fragment' | 'completion' | 'display';

interface MemoryTypeMap {
  timer: TimerState;
  round: RoundState;
  fragment: FragmentState;
  completion: CompletionState;
  display: DisplayState;
}
```

---

## Strategy Composition Examples

### Timer Block (e.g., "1:00 Work")

```typescript
class TimerBlockStrategy implements IRuntimeBlockStrategy {
  apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
    const duration = extractDuration(statements[0]);
    
    builder
      // Time aspect
      .addBehavior(new TimerInitBehavior({ direction: 'down', durationMs: duration }))
      .addBehavior(new TimerTickBehavior())
      .addBehavior(new TimerCompletionBehavior())
      .addBehavior(new TimerPauseBehavior())
      
      // Display aspect
      .addBehavior(new DisplayInitBehavior({ mode: 'countdown' }))
      
      // Output aspect
      .addBehavior(new TimerOutputBehavior())
      .addBehavior(new SoundCueBehavior({ cues: [
        { sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
        { sound: 'complete', trigger: 'complete' }
      ]}));
  }
}
```

### Loop Block (e.g., "5 Rounds")

```typescript
class LoopBlockStrategy implements IRuntimeBlockStrategy {
  apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
    const rounds = extractRounds(statements[0]);
    const childGroups = extractChildGroups(statements);
    
    builder
      // Iteration aspect
      .addBehavior(new RoundInitBehavior({ totalRounds: rounds }))
      .addBehavior(new RoundAdvanceBehavior())
      .addBehavior(new RoundCompletionBehavior())
      
      // Display aspect
      .addBehavior(new DisplayInitBehavior({ mode: 'clock' }))
      .addBehavior(new RoundDisplayBehavior())
      
      // Children aspect
      .addBehavior(new ChildRunnerBehavior({ childGroups }))
      
      // Output aspect
      .addBehavior(new RoundOutputBehavior())
      .addBehavior(new HistoryRecordBehavior());
  }
}
```

### Effort Block (e.g., "10 Push-ups") ✅ Implemented

```typescript
class EffortFallbackStrategy implements IRuntimeBlockStrategy {
  apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
    const label = getContent(statement, 'Effort');
    
    builder
      .setSourceIds(statements.map(s => s.id))
      .setContext(context)
      .setKey(blockKey)
      .setBlockType('effort')
      .setLabel(label)
      
      // Completion aspect
      .addBehavior(new PopOnNextBehavior())
      
      // Output aspect
      .addBehavior(new SegmentOutputBehavior({ label }));
  }
}
```

---

## Behavior Execution Order

Behaviors execute in **add order** within each lifecycle hook:

```
mount():
  1. *InitBehaviors (Timer, Round, Display, Controls)
  2. *SubscriptionBehaviors (Tick, Pause handlers)
  3. *RunnerBehaviors (push first child if any)
  4. *OutputBehaviors (Segment, Timer)

next():
  1. *AdvanceBehaviors (RoundAdvance)
  2. *CompletionBehaviors (check if done)
  3. *OutputBehaviors (Milestone)
  4. *RunnerBehaviors (push next child)

unmount():
  1. *OutputBehaviors (Completion, Timer)
  2. *HistoryBehaviors (record)
  3. *ControlsBehaviors (cleanup)
```

Strategies must add behaviors in correct order.

---

## Files Reference

All behavior implementations are in `src/runtime/behaviors/`:

| File | Behaviors |
|------|-----------|
| `index.ts` | Exports all behaviors |
| `TimerInitBehavior.ts` | TimerInitBehavior |
| `TimerTickBehavior.ts` | TimerTickBehavior |
| `TimerCompletionBehavior.ts` | TimerCompletionBehavior |
| `TimerPauseBehavior.ts` | TimerPauseBehavior |
| `TimerOutputBehavior.ts` | TimerOutputBehavior |
| `RoundInitBehavior.ts` | RoundInitBehavior |
| `RoundAdvanceBehavior.ts` | RoundAdvanceBehavior |
| `RoundCompletionBehavior.ts` | RoundCompletionBehavior |
| `RoundDisplayBehavior.ts` | RoundDisplayBehavior |
| `RoundOutputBehavior.ts` | RoundOutputBehavior |
| `PopOnNextBehavior.ts` | PopOnNextBehavior |
| `PopOnEventBehavior.ts` | PopOnEventBehavior |
| `DisplayInitBehavior.ts` | DisplayInitBehavior |
| `ChildRunnerBehavior.ts` | ChildRunnerBehavior |
| `SegmentOutputBehavior.ts` | SegmentOutputBehavior |
| `HistoryRecordBehavior.ts` | HistoryRecordBehavior |
| `SoundCueBehavior.ts` | SoundCueBehavior |
| `ControlsInitBehavior.ts` | ControlsInitBehavior |

---

## Test Coverage

Tests are in `src/runtime/behaviors/__tests__/AspectBehaviors.test.ts`:

- ✅ TimerInitBehavior (2 tests)
- ✅ TimerCompletionBehavior (1 test)
- ✅ RoundInitBehavior (2 tests)
- ✅ RoundAdvanceBehavior (2 tests)
- ✅ RoundCompletionBehavior (2 tests)
- ✅ DisplayInitBehavior (2 tests)
- ✅ PopOnEventBehavior (1 test)

**Total: 12 tests passing**

---

## Next Steps

1. [x] Define TypeScript interfaces for all memory models
2. [x] Create behavior implementations for each aspect
3. [x] Implement memory mutation (`setMemory` → `SimpleMemoryEntry`)
4. [x] Update BlockBuilder to support new patterns
5. [x] Migrate EffortFallbackStrategy as proof of concept
6. [ ] Migrate remaining strategies (Timer, Loop, Interval)
7. [ ] Add integration tests for multi-behavior compositions
8. [ ] Update UI to observe memory state changes
