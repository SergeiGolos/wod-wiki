# Clock & Timer UI Integration Analysis

This document provides a comprehensive analysis of how the workout timer UI, display cards, and runtime block execution are integrated in WOD Wiki. It identifies current gaps and proposes a plan to align the clock view with the runtime memory system.

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [UI Components](#ui-components)
3. [Runtime Blocks & Timer Registration](#runtime-blocks--timer-registration)
4. [Memory System for Timers](#memory-system-for-timers)
5. [Data Flow Analysis](#data-flow-analysis)
6. [Gap Analysis](#gap-analysis)
7. [Alignment Plan](#alignment-plan)

---

## Current Architecture Overview

The timer/clock system uses a **stack-based display architecture** with **memory subscriptions**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow Diagram                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Runtime Blocks (TimerBlock, RoundsBlock, EffortBlock)          │
│       │                                                         │
│       ▼                                                         │
│  Behaviors (TimerBehavior, LoopCoordinatorBehavior)             │
│       │                                                         │
│       ▼                                                         │
│  Actions (PushTimerDisplayAction, PushCardDisplayAction, etc.)  │
│       │                                                         │
│       ▼                                                         │
│  RuntimeMemory                                                  │
│    • IDisplayStackState (timer stack, card stack, workout state)│
│    • TimerState (spans, isRunning, format)                      │
│       │                                                         │
│       ▼                                                         │
│  React Hooks (useDisplayStack, useMemorySubscription)           │
│       │                                                         │
│       ▼                                                         │
│  UI Components (StackedClockDisplay, TimerDisplay, DigitalClock)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **StackedClockDisplay** | `src/clock/components/StackedClockDisplay.tsx` | Main clock UI - renders timer stack and card stacks |
| **TimerDisplay** | `src/components/workout/TimerDisplay.tsx` | Enhanced timer with multi-timer stack and activity cards |
| **DigitalClock** | `src/clock/components/DigitalClock.tsx` | Standalone digital clock for side-by-side layouts |
| **TimeDisplay** | `src/clock/components/TimeDisplay.tsx` | Renders array of time units with separators |
| **ClockAnchor** | `src/clock/components/ClockAnchor.tsx` | Anchor component with play/pause controls |

### Card Components

| Card Type | Description |
|-----------|-------------|
| `idle-start` | Workout not started - "Start Workout" |
| `idle-complete` | Workout finished - "View Analytics" |
| `active-block` | Currently executing block - shows metrics |
| `rest-period` | Rest period between efforts |
| `custom` | Custom component specified by componentId |

### Key Props Interfaces

#### IDisplayStackState (Clock View State)

```typescript
interface IDisplayStackState {
  timerStack: ITimerDisplayEntry[];     // Stack of timer displays
  cardStack: IDisplayCardEntry[];       // Stack of info cards
  workoutState: 'idle' | 'running' | 'paused' | 'complete';
  totalElapsedMs?: number;              // ⚠️ NOT POPULATED
  currentRound?: number;                // Updated by SetRoundsDisplayAction
  totalRounds?: number;                 // Updated by SetRoundsDisplayAction
}
```

#### ITimerDisplayEntry

```typescript
interface ITimerDisplayEntry {
  id: string;                           // Unique identifier
  ownerId: string;                      // Block key that owns this timer
  timerMemoryId: string;                // Memory reference ID for TimeSpan[]
  label?: string;                       // Custom label to display
  format: 'countdown' | 'countup';      // Timer direction
  durationMs?: number;                  // For countdown format
  buttons?: IDisplayButton[];           // Optional button configurations
  priority?: number;                    // Display ordering (lower = more important)
}
```

---

## Runtime Blocks & Timer Registration

### Block Types and Timer Relationship

| Block Type | File | Timer Owner | Creates Timer |
|------------|------|-------------|---------------|
| **TimerBlock** | `src/runtime/blocks/TimerBlock.ts` | Via TimerBehavior | ✅ Yes |
| **RoundsBlock** | `src/runtime/blocks/RoundsBlock.ts` | Via LoopCoordinatorBehavior | ❌ No (tracks rounds only) |
| **EffortBlock** | `src/runtime/blocks/EffortBlock.ts` | None | ❌ No (tracks reps) |
| **RuntimeBlock** | `src/runtime/blocks/RuntimeBlock.ts` | Base class | Via attached behaviors |

### Timer Registration Pattern (TimerBehavior)

```typescript
// In TimerBehavior.onPush()
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // 1. Allocate timer state in memory
  const initialState: TimerState = {
    blockId: block.key.toString(),
    label: this.label,
    format: this.direction === 'down' ? 'down' : 'up',
    durationMs: this.durationMs,
    spans: [{ start: Date.now(), state: 'new' }],
    isRunning: true,
    card: { title: '...', subtitle: '...' }
  };

  this.timerRef = runtime.memory.allocate<TimerState>(
    `${MemoryTypeEnum.TIMER_PREFIX}${block.key.toString()}`,  // Type: "timer:block-123"
    block.key.toString(),                                      // OwnerId: block key
    initialState,
    'public'
  );

  // 2. Register with unified clock for tick events
  runtime.clock.register(this);

  // 3. Return display actions
  return [
    new PushTimerDisplayAction({
      id: `timer-${block.key}`,
      ownerId: block.key.toString(),
      timerMemoryId: this.timerRef.id,
      label: this.label,
      format: this.direction === 'down' ? 'countdown' : 'countup',
      durationMs: this.durationMs,
    }),
    new PushCardDisplayAction({
      id: `card-${block.key}`,
      ownerId: block.key.toString(),
      type: 'active-block',
      title: this.direction === 'down' ? 'AMRAP' : 'For Time',
      subtitle: this.label,
      metrics: block.compiledMetrics?.values.map(m => ({
        type: m.type, value: m.value ?? 0, unit: m.unit, isActive: true
      }))
    })
  ];
}
```

### Rounds Registration Pattern (LoopCoordinatorBehavior)

```typescript
// In LoopCoordinatorBehavior.onNext()
onNext(runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
  const state = this.getState();
  const actions: IRuntimeAction[] = [];

  // Update round display info
  const currentRound = state.rounds + 1;
  const totalRounds = this.config.totalRounds;
  
  if (totalRounds) {
    actions.push(new SetRoundsDisplayAction(currentRound, totalRounds));
  }

  // ... compile and push child blocks
  return actions;
}
```

---

## Memory System for Timers

### Memory Types

| Enum Value | Pattern | Description |
|------------|---------|-------------|
| `DISPLAY_STACK_STATE` | `displaystack` | UI display hierarchy state |
| `TIMER_PREFIX` | `timer:` | Timer state per block |
| `METRICS_CURRENT` | `metrics:current` | Live metrics for UI |
| `HANDLER_PREFIX` | `handler:` | Event handlers |

### TimerState Model

```typescript
interface TimerState {
  blockId: string;              // Owning block ID
  label: string;                // Display label
  format: 'up' | 'down' | 'time';  // Timer direction
  durationMs?: number;          // For countdown timers
  card?: TimerCardConfig;       // Display card config
  spans: TimerSpan[];           // Time tracking segments
  isRunning: boolean;           // Current state
}

interface TimerSpan {
  start: number;                // Timestamp when segment started
  stop?: number;                // Timestamp when stopped (undefined = running)
  state: 'new' | 'reported';
}
```

### Subscription Pattern

Components subscribe to memory changes via hooks:

```typescript
// useDisplayStack.ts
export function useDisplayStack(): IDisplayStackState {
  const runtime = useRuntimeContext();

  const stateRef = useMemo(() => {
    const refs = runtime.memory.search({
      type: MemoryTypeEnum.DISPLAY_STACK_STATE,
      ownerId: 'runtime',
      id: null, visibility: null
    });
    return refs[0] as TypedMemoryReference<IDisplayStackState> | undefined;
  }, [runtime]);

  return useMemorySubscription(stateRef) || createDefaultDisplayState();
}
```

---

## Data Flow Analysis

### Current Timer Data Flow

1. **Block Creation**: Strategy compiles statements → creates block with TimerBehavior
2. **Block Mount**: `TimerBehavior.onPush()` allocates memory + pushes display actions
3. **Action Execution**: `PushTimerDisplayAction` updates `IDisplayStackState.timerStack`
4. **UI Subscription**: `useDisplayStack()` hook receives new state, triggers re-render
5. **Timer Calculation**: UI reads `timerMemoryId` → gets `TimeSpan[]` → calculates elapsed

### What Gets Displayed (Screenshot Analysis)

| UI Element | Source | Memory Location |
|------------|--------|-----------------|
| Main Timer (00:00.00) | `timerStack[last].timerMemoryId` → TimeSpan[] | `timer:blockKey` |
| Round Counter (Round 1/3) | `IDisplayStackState.currentRound/totalRounds` | `DISPLAY_STACK_STATE` |
| Metric Badges (3 Rounds, 21, 15, 9) | `cardStack[last].metrics` | Card pushed by behavior |
| Control Buttons | `cardStack[last].buttons` or default controls | Card pushed by behavior |

---

## Gap Analysis

### 🔴 Critical Gaps

#### 1. Root Total Time NOT Tracked

**Problem**: `IDisplayStackState.totalElapsedMs` is defined but **never populated**.

**Current State**:
```typescript
// DisplayTypes.ts
interface IDisplayStackState {
  totalElapsedMs?: number;  // ← DEFINED but always 0 or undefined
}

// createDefaultDisplayState()
return {
  totalElapsedMs: 0,  // ← Set to 0, never updated
};
```

**Impact**: Cannot show total workout elapsed time separate from current segment timer.

**Who Should Update**: No action or behavior currently updates this field.

---

#### 2. Current Lap/Round Timer NOT Tracked

**Problem**: There's no distinction between:
- **Root Timer**: Total workout elapsed time
- **Segment Timer**: Current round/interval timer
- **Leaf Timer**: Current exercise/effort timer

**Current State**:
- Only ONE timer can be "primary" (top of `timerStack`)
- Secondary timers are shown as small badges on mobile or floating cards on desktop
- No semantic distinction between timer *purposes*

**Impact**: EMOM workouts need both:
- Total workout time (e.g., "12 min EMOM total")
- Current interval time (e.g., "45s remaining in minute 7")

---

#### 3. Timer Stack Priority vs Semantic Roles

**Problem**: The `priority` field controls display order but doesn't indicate timer *role*.

```typescript
interface ITimerDisplayEntry {
  priority?: number;  // Display ordering only, not semantic meaning
}
```

**Impact**: UI cannot distinguish between:
- A root workout timer (should always show in header)
- A segment timer (current active timer)
- A child/leaf timer (nested within segment)

---

### 🟡 Moderate Gaps

#### 4. Round Information Duplication

**Problem**: Round info exists in two places:
- `IDisplayStackState.currentRound/totalRounds`
- `LoopCoordinatorBehavior` internal state

**Current Flow**:
```
LoopCoordinatorBehavior.onNext() → SetRoundsDisplayAction → IDisplayStackState
```

**Impact**: Works for display, but no way to query current round from memory without searching for the RoundsBlock.

---

#### 5. No "Global Timer" Concept

**Problem**: No mechanism for a workout-level timer that persists across all blocks.

**Current State**:
- Each `TimerBehavior` creates its own timer with its own spans
- When a TimerBlock pops, its timer is removed from display
- Nested EMOM (timer within rounds within timer) doesn't aggregate

**Impact**: Cannot implement:
- "Workout started at 9:20 PM, total time: 15:32"
- "You completed 12 minutes of your 20 minute AMRAP"

---

### 🟢 Minor Gaps

#### 6. Timer Labels Not Dynamic

**Problem**: Timer labels set at push time, not updated during execution.

```typescript
// TimerBehavior.onPush()
new PushTimerDisplayAction({
  label: this.label,  // ← Set once, never updated
});
```

**Impact**: Cannot show "Round 3 of 5 - Pull-ups" as label updates.

---

## Alignment Plan

### Phase 1: Root Total Time Tracking

**Goal**: Track total workout elapsed time from start to finish.

**Implementation**:

1. **Create `GlobalTimerBehavior`** (or extend ScriptRuntime):
   ```typescript
   // When workout starts (first block pushed)
   const globalTimerRef = runtime.memory.allocate<TimeSpan[]>(
     'timer:global',
     'runtime',
     [{ start: Date.now() }],
     'public'
   );
   ```

2. **Update `SetWorkoutStateAction`** to manage global timer:
   ```typescript
   do(runtime: IScriptRuntime): void {
     // ... existing code ...
     
     if (this.workoutState === 'running' && previousState === 'idle') {
       // Start global timer
       const globalTimerRef = runtime.memory.allocate<TimeSpan[]>(
         'timer:global', 'runtime', [{ start: Date.now() }], 'public'
       );
       state.globalTimerMemoryId = globalTimerRef.id;
     }
     
     // Update totalElapsedMs on every state change
     if (state.globalTimerMemoryId) {
       const spans = runtime.memory.get(state.globalTimerMemoryId);
       state.totalElapsedMs = calculateElapsed(spans);
     }
   }
   ```

3. **Add `globalTimerMemoryId` to `IDisplayStackState`**:
   ```typescript
   interface IDisplayStackState {
     // ... existing ...
     globalTimerMemoryId?: string;  // NEW: References timer:global
   }
   ```

**Effort**: ~4 hours

---

### Phase 2: Semantic Timer Roles

**Goal**: Distinguish between root/segment/leaf timers.

**Implementation**:

1. **Extend `ITimerDisplayEntry` with role**:
   ```typescript
   interface ITimerDisplayEntry {
     // ... existing ...
     role?: 'root' | 'segment' | 'leaf';  // NEW: Semantic purpose
   }
   ```

2. **Update `TimerBehavior` to set role based on context**:
   ```typescript
   onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
     // Determine role based on stack depth
     const stackDepth = runtime.stack.depth();
     const role = stackDepth === 1 ? 'root' : 
                  block.hasChildren ? 'segment' : 'leaf';
     
     return [new PushTimerDisplayAction({
       // ... existing ...
       role,
     })];
   }
   ```

3. **Update UI to use roles**:
   ```typescript
   // StackedClockDisplay.tsx
   const rootTimer = timerStack.find(t => t.role === 'root');
   const segmentTimer = timerStack.find(t => t.role === 'segment');
   const leafTimer = timerStack.find(t => t.role === 'leaf');
   ```

**Effort**: ~6 hours

---

### Phase 3: Lap/Round Timer Integration

**Goal**: Track current lap/round timer separately from total.

**Implementation**:

1. **Add `currentLapTimerMemoryId` to `IDisplayStackState`**:
   ```typescript
   interface IDisplayStackState {
     // ... existing ...
     currentLapTimerMemoryId?: string;  // NEW: Current round/interval timer
   }
   ```

2. **Update `LoopCoordinatorBehavior` to manage lap timer**:
   ```typescript
   private emitRoundChanged(runtime: IScriptRuntime, rounds: number, block: IRuntimeBlock): void {
     // ... existing record creation ...
     
     // Create lap timer for this round
     const lapTimerRef = runtime.memory.allocate<TimeSpan[]>(
       `timer:lap:${block.key}:${rounds}`,
       block.key.toString(),
       [{ start: Date.now() }],
       'public'
     );
     
     // Update display state
     const stateRef = findDisplayState(runtime);
     const state = stateRef.get();
     state.currentLapTimerMemoryId = lapTimerRef.id;
     stateRef.set(state);
   }
   ```

**Effort**: ~4 hours

---

### Phase 4: Unified Timer View

**Goal**: Create a coherent UI showing all three timer levels.

**Implementation**:

1. **Add `useTimerHierarchy` hook**:
   ```typescript
   export function useTimerHierarchy(): {
     root: { elapsedMs: number; durationMs?: number } | null;
     segment: { elapsedMs: number; durationMs?: number; label: string } | null;
     leaf: { elapsedMs: number; label: string } | null;
   } {
     const displayState = useDisplayStack();
     const timerStack = displayState.timerStack;
     
     return {
       root: findTimerByRole(timerStack, 'root'),
       segment: findTimerByRole(timerStack, 'segment'),
       leaf: findTimerByRole(timerStack, 'leaf'),
     };
   }
   ```

2. **Update `StackedClockDisplay` to render hierarchy**:
   ```tsx
   function StackedClockDisplay() {
     const { root, segment, leaf } = useTimerHierarchy();
     
     return (
       <div>
         {/* Header: Total workout time */}
         {root && <TotalTimeHeader elapsed={root.elapsedMs} />}
         
         {/* Main: Segment timer (largest) */}
         {segment && <MainTimerDisplay {...segment} />}
         
         {/* Secondary: Current effort */}
         {leaf && <SecondaryTimer {...leaf} />}
       </div>
     );
   }
   ```

**Effort**: ~8 hours

---

## Summary

### Current State
- ✅ Timer registration works via `TimerBehavior` + `PushTimerDisplayAction`
- ✅ Round tracking works via `LoopCoordinatorBehavior` + `SetRoundsDisplayAction`
- ✅ Memory subscription pattern works for reactive updates
- ❌ No root/total workout timer
- ❌ No semantic timer roles (root/segment/leaf)
- ❌ `totalElapsedMs` never populated

### What It Would Take

| Goal | Components to Add/Modify | Effort |
|------|--------------------------|--------|
| **Root Total Time** | `SetWorkoutStateAction`, `IDisplayStackState` | ~4 hours |
| **Semantic Timer Roles** | `ITimerDisplayEntry`, `TimerBehavior`, UI components | ~6 hours |
| **Lap/Round Timer** | `LoopCoordinatorBehavior`, `IDisplayStackState` | ~4 hours |
| **Unified Timer View** | New hook + UI refactor | ~8 hours |
| **Total** | | **~22 hours** |

### Recommended Priority

1. **Phase 1: Root Total Time** - Highest impact, simplest implementation
2. **Phase 3: Lap Timer** - Needed for EMOM/interval workouts
3. **Phase 2: Semantic Roles** - Better architecture, enables Phase 4
4. **Phase 4: Unified View** - Complete user experience

---

## Appendix: File References

| File | Purpose |
|------|---------|
| [src/clock/types/DisplayTypes.ts](src/clock/types/DisplayTypes.ts) | Display stack types |
| [src/clock/hooks/useDisplayStack.ts](src/clock/hooks/useDisplayStack.ts) | React hooks for display state |
| [src/clock/components/StackedClockDisplay.tsx](src/clock/components/StackedClockDisplay.tsx) | Main clock UI component |
| [src/runtime/behaviors/TimerBehavior.ts](src/runtime/behaviors/TimerBehavior.ts) | Timer allocation & management |
| [src/runtime/behaviors/LoopCoordinatorBehavior.ts](src/runtime/behaviors/LoopCoordinatorBehavior.ts) | Round/loop management |
| [src/runtime/actions/TimerDisplayActions.ts](src/runtime/actions/TimerDisplayActions.ts) | Timer stack actions |
| [src/runtime/actions/WorkoutStateActions.ts](src/runtime/actions/WorkoutStateActions.ts) | Workout state + rounds actions |
| [src/runtime/MemoryTypeEnum.ts](src/runtime/MemoryTypeEnum.ts) | Memory type constants |
