# Data Model: Runtime Block Implementation

**Feature**: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock  
**Date**: 2025-10-08

## Overview
This document defines the data structures, interfaces, and state management for the runtime block execution system. All entities are runtime-only (in-memory) with no persistence beyond the active session.

---

## Core Entities

### RuntimeBlock (Base Interface)
**Existing interface in `src/runtime/RuntimeBlock.ts`**

```typescript
interface RuntimeBlock {
  id: string;                    // Unique block identifier
  type: string;                  // Block type name
  children?: RuntimeBlock[];     // Child blocks (for composite blocks)
  
  // Lifecycle methods
  push(): void;                  // Called when block begins execution
  pop(): void;                   // Called when block ends execution
  dispose(): void;               // Cleanup resources
  
  // Behavior composition
  behaviors: RuntimeBehavior[];  // Attached behaviors
}
```

**Relationships**:
- Has many `RuntimeBehavior` (composition)
- May have many child `RuntimeBlock` (tree structure)

**State Transitions**: NotCreated → Created → Pushed → Popped → Disposed

---

### TimerBlock
**New concrete implementation**

```typescript
class TimerBlock implements RuntimeBlock {
  id: string;
  type: 'timer';
  children?: RuntimeBlock[];
  behaviors: RuntimeBehavior[];
  
  // Configuration
  direction: 'up' | 'down';
  durationMs?: number;           // For countdown timers
  
  // Runtime state (managed by TimerBehavior)
  state: TimerState;
}

interface TimerState {
  startTime: number;             // performance.now() at start
  pausedAt?: number;             // performance.now() when paused
  elapsedMs: number;             // Total elapsed time
  displayTime: number;           // Rounded to 0.1s for UI
  intervalId?: number;           // setInterval ID for cleanup
  isRunning: boolean;
  isPaused: boolean;
}
```

**Validation Rules**:
- `durationMs` MUST be positive integer for countdown timers
- `direction` MUST be 'up' or 'down'
- `elapsedMs` MUST NOT be negative
- `displayTime` precision is 0.1s (100ms)

**State Transitions**:
```
NotStarted → Running → [Paused ↔ Running]* → Complete → Disposed
```

**Events Emitted**:
- `timer:tick` (every ~100ms for 0.1s display updates)
- `timer:pause`
- `timer:resume`
- `timer:complete`

---

### RoundsBlock
**New concrete implementation**

```typescript
class RoundsBlock implements RuntimeBlock {
  id: string;
  type: 'rounds';
  children: RuntimeBlock[];      // Exercise blocks for current round
  behaviors: RuntimeBehavior[];
  
  // Configuration
  totalRounds: number;
  repScheme?: number[];          // For variable reps [21, 15, 9]
  
  // Runtime state (managed by RoundsBehavior)
  state: RoundState;
}

interface RoundState {
  currentRound: number;          // 1-indexed (1 to totalRounds)
  completedRounds: number;
  isComplete: boolean;
}
```

**Validation Rules**:
- `totalRounds` MUST be positive integer (>= 1)
- `currentRound` MUST be in range [1, totalRounds]
- `repScheme.length` MUST equal `totalRounds` if provided
- All values in `repScheme` MUST be positive integers

**State Transitions**:
```
Round1 → Round2 → ... → RoundN → Complete → Disposed
```

**Events Emitted**:
- `rounds:changed` (includes currentRound, totalRounds)
- `rounds:complete`

**Compilation Context**:
```typescript
interface RoundCompilationContext {
  currentRound: number;
  totalRounds: number;
  repScheme?: number[];
  
  // Helper method
  getRepsForCurrentRound(): number | undefined;
}
```

---

### EffortBlock
**New concrete implementation**

```typescript
class EffortBlock implements RuntimeBlock {
  id: string;
  type: 'effort';
  children: undefined;           // Terminal block (no children)
  behaviors: RuntimeBehavior[];
  
  // Configuration
  exerciseName: string;
  targetReps: number;
  
  // Runtime state
  state: EffortState;
}

interface EffortState {
  currentReps: number;           // 0 to targetReps
  isComplete: boolean;
  completionMode: 'incremental' | 'bulk' | null;
}
```

**Validation Rules**:
- `targetReps` MUST be positive integer (>= 1)
- `currentReps` MUST be in range [0, targetReps]
- `exerciseName` MUST be non-empty string
- Completion triggered when `currentReps >= targetReps`

**State Transitions**:
```
NotStarted → InProgress → Complete → Disposed
```

**User Actions**:
- `incrementRep()` - Add 1 rep (tap button)
- `setReps(count)` - Set bulk count (input field)
- `complete()` - Mark exercise done

**Events Emitted**:
- `reps:updated` (includes currentReps, targetReps)
- `reps:complete`

---

## Behavior Entities

### TimerBehavior
**New behavior implementation**

```typescript
class TimerBehavior implements RuntimeBehavior {
  name: 'timer';
  
  // Configuration
  config: TimerBehaviorConfig;
  
  // Lifecycle hooks
  onPush(): void;                // Start timer (setInterval)
  onPop(): void;                 // Stop timer (clearInterval)
  onEvent(event: RuntimeEvent): void; // Handle pause/resume
  
  // Internal methods
  private tick(): void;          // Update elapsed time
  private calculateDisplayTime(elapsedMs: number): number;
}

interface TimerBehaviorConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  tickIntervalMs: number;        // Default: 100ms for 0.1s updates
}
```

**Responsibilities**:
- Manage setInterval for periodic updates
- Calculate elapsed time using performance.now()
- Emit timer:tick events with current time
- Handle pause/resume events
- Cleanup interval on disposal

---

### RoundsBehavior
**New behavior implementation**

```typescript
class RoundsBehavior implements RuntimeBehavior {
  name: 'rounds';
  
  // Configuration
  config: RoundsBehaviorConfig;
  
  // Lifecycle hooks
  onPush(): void;                // Initialize currentRound = 1
  onNext(): void;                // Advance to next round
  onEvent(event: RuntimeEvent): void;
  
  // Context provision
  getCompilationContext(): RoundCompilationContext;
}

interface RoundsBehaviorConfig {
  totalRounds: number;
  repScheme?: number[];
}
```

**Responsibilities**:
- Track current round number
- Advance rounds when child blocks complete
- Provide rep targets for current round
- Emit rounds:changed events
- Signal completion when all rounds finished

---

### CompletionBehavior
**New generic behavior implementation**

```typescript
class CompletionBehavior implements RuntimeBehavior {
  name: 'completion';
  
  // Configuration
  config: CompletionBehaviorConfig;
  
  // Lifecycle hooks
  onNext(): void;                // Check completion after child
  onEvent(event: RuntimeEvent): void; // Check on specific events
  
  // Internal
  private checkCompletion(): void;
}

interface CompletionBehaviorConfig {
  // Condition function determines if block is complete
  condition: (runtime: ScriptRuntime, block: RuntimeBlock) => boolean;
  
  // Optional: Events that trigger completion check
  triggerEvents?: string[];
}
```

**Example Configurations**:

```typescript
// TimerBlock (countdown): Complete when timer reaches zero
{
  condition: (runtime, block) => block.state.elapsedMs >= block.durationMs,
  triggerEvents: ['timer:tick']
}

// TimerBlock (count-up): Complete when child completes
{
  condition: (runtime, block) => block.children?.every(c => c.isComplete),
  triggerEvents: ['block:complete']
}

// RoundsBlock: Complete when all rounds done
{
  condition: (runtime, block) => block.state.currentRound > block.totalRounds,
  triggerEvents: ['rounds:changed']
}

// EffortBlock: Complete when reps met
{
  condition: (runtime, block) => block.state.currentReps >= block.targetReps,
  triggerEvents: ['reps:updated']
}
```

---

## State Management

### Memory Allocation
**All state is allocated in-memory only. No persistence.**

```typescript
// Example memory layout for Fran workout
// (21-15-9) of Thrusters and Pullups, For Time

Stack: [
  TimerBlock {
    id: 'timer-1',
    direction: 'up',
    state: { elapsedMs: 0, isRunning: true },
    children: [
      RoundsBlock {
        id: 'rounds-1',
        totalRounds: 3,
        repScheme: [21, 15, 9],
        state: { currentRound: 1 },
        children: [
          EffortBlock {
            id: 'effort-1',
            exerciseName: 'Thrusters',
            targetReps: 21,  // From repScheme[0]
            state: { currentReps: 0 }
          }
          // Next: Pullups block (lazy compiled)
        ]
      }
    ]
  }
]
```

### State Update Patterns

**Incremental Rep Update**:
```typescript
// User taps button
effortBlock.state.currentReps += 1;
runtime.emit('reps:updated', { 
  blockId: effortBlock.id,
  currentReps: effortBlock.state.currentReps,
  targetReps: effortBlock.targetReps
});

if (effortBlock.state.currentReps >= effortBlock.targetReps) {
  effortBlock.state.isComplete = true;
  runtime.emit('reps:complete', { blockId: effortBlock.id });
}
```

**Round Advancement**:
```typescript
// When all exercises in round complete
roundsBlock.state.currentRound += 1;
roundsBlock.state.completedRounds += 1;

runtime.emit('rounds:changed', {
  blockId: roundsBlock.id,
  currentRound: roundsBlock.state.currentRound,
  totalRounds: roundsBlock.totalRounds
});

if (roundsBlock.state.currentRound > roundsBlock.totalRounds) {
  roundsBlock.state.isComplete = true;
  runtime.emit('rounds:complete', { blockId: roundsBlock.id });
}
```

**Timer Tick**:
```typescript
// Every ~100ms
const now = performance.now();
timerBlock.state.elapsedMs = now - timerBlock.state.startTime;
timerBlock.state.displayTime = Math.floor(timerBlock.state.elapsedMs / 100) / 10;

runtime.emit('timer:tick', {
  blockId: timerBlock.id,
  elapsedMs: timerBlock.state.elapsedMs,
  displayTime: timerBlock.state.displayTime
});
```

---

## Workout Examples Data Models

### Fran: (21-15-9) of Thrusters and Pullups, For Time

```typescript
TimerBlock {
  direction: 'up',
  children: [
    RoundsBlock {
      totalRounds: 3,
      repScheme: [21, 15, 9],
      children: [
        EffortBlock { exerciseName: 'Thrusters', targetReps: 21 },
        EffortBlock { exerciseName: 'Pullups', targetReps: 21 }
      ]
    }
  ]
}
// Round 2 & 3 lazy-compiled with targetReps from repScheme
```

### Cindy: 20-min AMRAP of 5 Pullups, 10 Pushups, 15 Squats

```typescript
TimerBlock {
  direction: 'down',
  durationMs: 1200000, // 20 minutes
  children: [
    RoundsBlock {
      totalRounds: Infinity, // AMRAP = unlimited rounds
      children: [
        EffortBlock { exerciseName: 'Pullups', targetReps: 5 },
        EffortBlock { exerciseName: 'Pushups', targetReps: 10 },
        EffortBlock { exerciseName: 'Squats', targetReps: 15 }
      ]
    }
  ]
}
```

### Grace: 30 Clean & Jerks For Time

```typescript
TimerBlock {
  direction: 'up',
  children: [
    EffortBlock { exerciseName: 'Clean & Jerk', targetReps: 30 }
  ]
}
```

---

## Disposal and Cleanup

### Disposal Sequence
```typescript
// When workout completes or is abandoned
1. RuntimeBlock.dispose() called on root block
2. Root block calls dispose() on all behaviors
3. Behaviors cleanup resources:
   - TimerBehavior: clearInterval(intervalId)
   - RoundsBehavior: nullify repScheme reference
   - CompletionBehavior: remove event listeners
4. Root block calls dispose() on all children recursively
5. All references nullified for GC
```

### Memory Leak Prevention
- **TimerBehavior**: MUST clear interval in dispose()
- **Event listeners**: MUST be removed in dispose()
- **Circular references**: Avoided via one-way parent→child relationships
- **Performance requirement**: dispose() MUST complete in <50ms

---

## Validation Summary

### Compile-Time Validation (TypeScript)
- All interfaces strictly typed
- State transitions enforced by type guards
- Invalid configurations caught at compile time

### Runtime Validation
- Rep counts: 0 ≤ current ≤ target
- Round numbers: 1 ≤ current ≤ total
- Timer values: elapsed ≥ 0
- Block lifecycle: Cannot push() already-pushed block

### Event Validation
- All events include blockId for origin tracking
- Event data matches expected schema
- No dangling event listeners after disposal

---

**Status**: Data model complete ✅  
**Next**: Generate contracts and quickstart
