# Behavior Simplification Details

This document details the current behavior system and how it can be simplified to a single `IBehavior` functional interface as proposed in the Runtime Cycle canvas diagram.

---

## Current Behavior System

### Behavior Inventory

The current runtime has **11 distinct behavior types**, each implementing lifecycle hooks that compose together to form block functionality.

| Behavior | Purpose | LOC | Complexity |
|----------|---------|-----|------------|
| `TimerBehavior` | Timer countdown/count-up logic, display coordination | ~484 | **High** |
| `LoopCoordinatorBehavior` | Child block iteration, round tracking | ~525 | **High** |
| `RootLifecycleBehavior` | Root block lifecycle management | ~339 | **High** |
| `CompletionBehavior` | Block completion detection | ~80 | Medium |
| `HistoryBehavior` | Execution history tracking | ~60 | Low |
| `SoundBehavior` | Audio cue playback triggers | ~50 | Low |
| `IdleBehavior` | Idle/rest period handling | ~40 | Low |
| `ActionLayerBehavior` | UI action layer management | ~100 | Medium |
| `PrimaryClockBehavior` | Primary clock reference | ~60 | Low |
| `RuntimeControlsBehavior` | Runtime control actions (play/pause/stop) | ~120 | Medium |
| `TimerStateManager` | Timer state machine coordination | ~150 | Medium |

**Total Behavior LOC: ~2,000+**

---

## Current IRuntimeBehavior Interface

```typescript
interface IRuntimeBehavior {
  /**
   * Called when the block is pushed onto the stack
   */
  onPush(context: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when the block receives a "next" signal
   */
  onNext(context: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when the block is popped from the stack
   */
  onPop(context: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when the block is being disposed
   */
  onDispose(context: IBehaviorContext): void;

  /**
   * Called when an event is dispatched to the block
   */
  onEvent?(event: IEvent, context: IBehaviorContext): IRuntimeAction[];
}
```

### Lifecycle Hook Complexity

Each behavior can return actions from each lifecycle hook, creating a matrix of potential side effects:

```
                    onPush    onNext    onPop     onEvent
                    ──────    ──────    ─────     ───────
TimerBehavior         ✓         ✓         ✓         ✓
LoopCoordinator       ✓         ✓         ✓         ✓
RootLifecycle         ✓         ✓         ✓         ✓
CompletionBehavior    -         ✓         -         -
HistoryBehavior       ✓         -         ✓         -
SoundBehavior         ✓         -         ✓         ✓
IdleBehavior          ✓         ✓         ✓         -
ActionLayerBehavior   ✓         -         ✓         -
PrimaryClockBehavior  ✓         -         ✓         -
RuntimeControls       ✓         -         ✓         ✓
TimerStateManager     -         ✓         -         ✓
```

---

## Proposed IBehavior Architecture

The simplified architecture uses a **high-level `IBehavior` interface** with **optional sub-interfaces** for each lifecycle operation. This provides flexibility while maintaining a clean API.

### Sub-Interfaces (Optional)

Behaviors implement only the interfaces they need:

```typescript
/**
 * Optional interface for behaviors that respond to block push events.
 */
interface IPushBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * Optional interface for behaviors that respond to next/tick events.
 */
interface INextBehavior {
  onNext(context: IBehaviorContext): IRuntimeAction[];
}

/**
 * Optional interface for behaviors that respond to block pop events.
 */
interface IPopBehavior {
  onPop(context: IBehaviorContext): IRuntimeAction[];
}
```

### Main IBehavior Interface

```typescript
/**
 * High-level behavior interface with single execution entry point.
 * The `do` method dispatches to appropriate sub-interface methods.
 */
interface IBehavior {
  do(operation: 'push' | 'next' | 'pop', context: IBehaviorContext): IRuntimeAction[];
}
```

### BaseBehavior Abstract Class

The abstract class handles dispatch logic automatically:

```typescript
abstract class BaseBehavior implements IBehavior {
  /**
   * Tests `this` for defined interfaces and executes if present.
   * Returns empty array if no matching interface is implemented.
   */
  do(operation: BehaviorOperation, context: IBehaviorContext): IRuntimeAction[] {
    switch (operation) {
      case 'push':
        if (isPushBehavior(this)) return this.onPush(context);
        break;
      case 'next':
        if (isNextBehavior(this)) return this.onNext(context);
        break;
      case 'pop':
        if (isPopBehavior(this)) return this.onPop(context);
        break;
    }
    return [];
  }
}
```

### Implementation Status

✅ **IMPLEMENTED**: See `src/runtime/behaviors/IBehavior.ts`

The new behavior system includes:
- `IBehavior` - Main interface with `do(operation, context)` method
- `IPushBehavior`, `INextBehavior`, `IPopBehavior` - Optional sub-interfaces
- `BaseBehavior` - Abstract class with automatic dispatch
- `isPushBehavior()`, `isNextBehavior()`, `isPopBehavior()` - Type guards
- `composeBehaviors()` - Utility to combine multiple behaviors
- `createBehavior()` - Factory for functional behaviors

### Implementation Example

```typescript
// Example 1: Class-based behavior implementing only push/pop
class DisplayBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [displayAction('push', 'timer', ctx.block.displayData)];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [displayAction('pop', 'timer', ctx.block.id)];
  }
  // onNext not implemented - BaseBehavior.do() returns [] for 'next' operation
}

// Example 2: Full lifecycle behavior
class TimerBehavior extends BaseBehavior implements IPushBehavior, INextBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [startTimer(ctx.block.id, ctx.block.duration)];
  }

  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    return [updateTimerDisplay(ctx.block.id)];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [stopTimer(ctx.block.id)];
  }
}

// Example 3: Composing behaviors
const timerBlockBehavior = composeBehaviors([
  new TimerBehavior(config),
  new DisplayBehavior(),
  new SoundBehavior(sounds)
]);

// Execute all behaviors for a push operation
const actions = timerBlockBehavior.do('push', context);
```

---

## Old-to-New Behavior Mapping

This section maps existing behaviors to the new IBehavior pattern, identifying the **core intent** of each behavior and how it decomposes into focused, composable units that follow the "7 things" rule.

### Design Principles for New Behaviors

1. **Single Responsibility**: Each behavior does ONE thing well
2. **Max 7 Operations**: No more than 7 logical operations per class/method
3. **Memory-Focused**: Behaviors read/write memory locations, actions handle side effects
4. **Composable**: Complex behaviors = composition of simple behaviors
5. **Testable**: Pure functions where possible, minimal state

---

### TimerBehavior (484 LOC) → 3 Composable Behaviors

**Current Intent**: Manage timer lifecycle, state, display, and tick handling

**Problem**: Does too many things - state management, display coordination, tick handling, pause/resume, sound coordination, memory management

**Decomposition**:

| New Behavior             | Interface       | Responsibilities (≤7)                                                                                   |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------- |
| `TimerLifecycleBehavior` | `IPush`, `IPop` | 1. Register with clock on push, 2. Unregister on pop, 3. Allocate timer memory, 4. Release timer memory |
| `TimerDisplayBehavior`   | `IPush`, `IPop` | 1. Push timer display on push, 2. Pop timer display on pop, 3. Push card display, 4. Pop card display   |
| `TimerTickHandler`       | Event Handler   | 1. Calculate elapsed time, 2. Check completion, 3. Update memory, 4. Emit tick event                    |

**Memory Locations**:
- `timer:{blockId}` → `TimerState { spans, isRunning, direction, duration }`

```typescript
class TimerLifecycleBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    // 1. Allocate timer state memory
    // 2. Register with unified clock
    // 3. Emit timer:started event
    return [
      new AllocateMemoryAction('timer', ctx.block.id, initialState),
      new RegisterClockAction(ctx.block.id),
      new EmitEventAction('timer:started', { blockId: ctx.block.id })
    ];
  }

  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    // 1. Unregister from clock
    // 2. Emit timer:stopped event
    return [
      new UnregisterClockAction(ctx.block.id),
      new EmitEventAction('timer:stopped', { blockId: ctx.block.id })
    ];
  }
}
```

---

### LoopCoordinatorBehavior (525 LOC) → 3 Composable Behaviors

**Current Intent**: Manage round iteration, child compilation, and loop completion

**Problem**: Handles too many loop types (FIXED, REP_SCHEME, TIME_BOUND, INTERVAL) with complex state machine

**Decomposition**:

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `LoopStateBehavior` | `IPush` | 1. Initialize loop state in memory, 2. Set total rounds, 3. Set current position |
| `LoopAdvanceBehavior` | `INext` | 1. Increment index, 2. Check completion, 3. Compile next child, 4. Push child block, 5. Update round display |
| `LoopCompletionBehavior` | `INext` | 1. Check loop type completion, 2. Return empty if complete |

**Memory Locations**:
- `loop:{blockId}` → `LoopState { index, position, rounds, totalRounds, loopType }`

```typescript
class LoopAdvanceBehavior extends BaseBehavior implements INextBehavior {
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const loopState = ctx.runtime.memory.get<LoopState>(`loop:${ctx.block.id}`);
    
    // 1. Check if complete
    if (this.isComplete(loopState)) return [];
    
    // 2. Increment index
    const newState = this.advance(loopState);
    
    // 3. Compile next child group
    const childBlock = ctx.runtime.jit.compile(this.getChildGroup(newState));
    
    return [
      new UpdateMemoryAction(`loop:${ctx.block.id}`, newState),
      new DisplayAction('update', 'rounds', { current: newState.rounds + 1 }),
      new PushBlockAction(childBlock)
    ];
  }
}
```

---

### RootLifecycleBehavior (339 LOC) → 2 Composable Behaviors

**Current Intent**: Manage workout start/end states with idle blocks

**Problem**: Complex state machine mixing loop coordination with UI state

**Decomposition**:

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `WorkoutStateBehavior` | `IPush`, `INext`, `IPop` | 1. Set workout state to 'running' on push, 2. Transition through phases on next, 3. Set to 'complete' on pop |
| `IdleBlockInjector` | `IPush`, `INext` | 1. Inject initial idle block on push, 2. Inject final idle block when children complete |

**Memory Locations**:
- `workout:state` → `WorkoutState { phase: 'idle' | 'running' | 'cooldown' | 'complete' }`

```typescript
class WorkoutStateBehavior extends BaseBehavior implements IPushBehavior, INextBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new DisplayAction('update', 'state', 'running')];
  }
  
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const state = ctx.runtime.memory.get<WorkoutPhase>('workout:phase');
    // Transition based on current phase
    return this.transitionActions(state);
  }
  
  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new DisplayAction('update', 'state', 'complete')];
  }
}
```

---

### HistoryBehavior (162 LOC) → 1 Behavior (Already Focused)

**Current Intent**: Track execution spans for analytics

**Assessment**: Already well-scoped, just needs interface alignment

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `SpanTrackingBehavior` | `IPush`, `IPop` | 1. Create execution span on push, 2. Set parent span ID, 3. Initialize metrics, 4. Close span on pop, 5. Update end time |

**Memory Locations**:
- `span:{blockId}` → `TrackedSpan { id, blockId, parentSpanId, startTime, endTime, metrics }`

```typescript
class SpanTrackingBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    const parentId = ctx.runtime.stack.blocks.length >= 2 
      ? ctx.runtime.stack.blocks.at(-2)?.key.toString() 
      : null;
    
    return [new TrackAction('start', 'span', {
      blockId: ctx.block.id,
      parentSpanId: parentId,
      label: ctx.block.label
    })];
  }
  
  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new TrackAction('end', 'span', { blockId: ctx.block.id })];
  }
}
```

---

### CompletionBehavior (152 LOC) → 1 Behavior (Already Focused)

**Current Intent**: Detect block completion and trigger pop

**Assessment**: Well-scoped but could be simplified to pure function

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `CompletionCheckBehavior` | `INext` | 1. Evaluate condition, 2. Emit block:complete if true, 3. Return PopBlockAction if complete |

```typescript
class CompletionCheckBehavior extends BaseBehavior implements INextBehavior {
  constructor(private condition: (ctx: IBehaviorContext) => boolean) {
    super();
  }
  
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    if (!this.condition(ctx)) return [];
    
    return [
      new EmitEventAction('block:complete', { blockId: ctx.block.id }),
      new PopBlockAction()
    ];
  }
}
```

---

### SoundBehavior (330 LOC) → 2 Composable Behaviors

**Current Intent**: Trigger audio cues at timer thresholds

**Problem**: Mixes event handling with state management

**Decomposition**:

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `SoundStateBehavior` | `IPush`, `IPop` | 1. Initialize cue state in memory, 2. Register tick handler on push, 3. Unregister on pop |
| `SoundTriggerHandler` | Event Handler | 1. Check thresholds, 2. Mark cue triggered, 3. Return PlaySoundAction |

**Memory Locations**:
- `sound:{blockId}` → `SoundState { cues: CueState[] }`

```typescript
class SoundStateBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [
      new AllocateMemoryAction(`sound:${ctx.block.id}`, this.initialCueState()),
      new RegisterEventHandlerAction('timer:tick', this.tickHandler)
    ];
  }
  
  onPop(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new UnregisterEventHandlerAction('timer:tick', this.handlerId)];
  }
}
```

---

### IdleBehavior (131 LOC) → 1 Behavior (Already Focused)

**Current Intent**: Wait for user action before proceeding

**Assessment**: Well-scoped, needs minor interface alignment

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `IdleBehavior` | `IPush`, `INext` | 1. Allocate controls memory on push, 2. Register button, 3. Pop on next if configured |

```typescript
class IdleBehavior extends BaseBehavior implements IPushBehavior, INextBehavior {
  onPush(ctx: IBehaviorContext): IRuntimeAction[] {
    return [new RegisterAction('control', 'button', this.buttonConfig)];
  }
  
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    return this.popOnNext ? [new PopBlockAction()] : [];
  }
}
```

---

### ActionLayerBehavior (100 LOC) → 1 Behavior (Already Focused)

**Current Intent**: Manage UI action buttons for a block

**Assessment**: Clean, just needs interface alignment

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `ActionLayerBehavior` | `IPush`, `IPop` | 1. Build action descriptors from fragments, 2. Push action layer on push, 3. Pop action layer on pop |

---

### RuntimeControlsBehavior (55 LOC) → 1 Behavior (Already Focused)

**Current Intent**: Manage runtime control buttons (play/pause/stop)

**Assessment**: Simple, just allocates and updates memory

| New Behavior | Interface | Responsibilities (≤7) |
|--------------|-----------|----------------------|
| `ControlsBehavior` | `IPush` | 1. Allocate controls memory, 2. Update buttons via methods |

---

### TimerStateManager (150 LOC) → Merged into TimerDisplayBehavior

**Current Intent**: Coordinate timer memory state with display actions

**Assessment**: This is a helper class, not a behavior. Its responsibilities should be:
- State management → Part of `TimerLifecycleBehavior`
- Display coordination → Part of `TimerDisplayBehavior`

---

### PrimaryClockBehavior (40 LOC) → ELIMINATED

**Current Intent**: Register block as primary clock source

**Assessment**: This should be a property on `TimerDisplayBehavior` with role = 'primary', not a separate behavior.

---

## Summary: Old vs New Behavior Count

| Current | New | Notes |
|---------|-----|-------|
| `TimerBehavior` (484 LOC) | `TimerLifecycleBehavior` + `TimerDisplayBehavior` (~80 LOC) | Tick handling moves to event handler |
| `LoopCoordinatorBehavior` (525 LOC) | `LoopStateBehavior` + `LoopAdvanceBehavior` (~100 LOC) | Simpler state machine |
| `RootLifecycleBehavior` (339 LOC) | `WorkoutStateBehavior` + `IdleBlockInjector` (~60 LOC) | Clearer phase transitions |
| `CompletionBehavior` (152 LOC) | `CompletionCheckBehavior` (~30 LOC) | Same, just aligned |
| `HistoryBehavior` (162 LOC) | `SpanTrackingBehavior` (~40 LOC) | Same, just aligned |
| `SoundBehavior` (330 LOC) | `SoundStateBehavior` (~40 LOC) | Handler is event-based |
| `IdleBehavior` (131 LOC) | `IdleBehavior` (~30 LOC) | Same, just aligned |
| `ActionLayerBehavior` (100 LOC) | `ActionLayerBehavior` (~30 LOC) | Same, just aligned |
| `RuntimeControlsBehavior` (55 LOC) | `ControlsBehavior` (~20 LOC) | Same, just aligned |
| `TimerStateManager` (150 LOC) | *Merged* | Into display behavior |
| `PrimaryClockBehavior` (40 LOC) | *Eliminated* | Role property instead |

**Total Reduction**: ~2,468 LOC → ~430 LOC (83% reduction)

---

## Block Type Compositions

This section shows how the new behaviors compose to create runtime blocks. Each block type is a composition of focused behaviors.

### Timer Block (For Time / AMRAP)

```typescript
const timerBlock = composeBehaviors([
  new TimerLifecycleBehavior({ direction: 'down', durationMs: 600000 }),
  new TimerDisplayBehavior({ role: 'primary', label: 'AMRAP' }),
  new SpanTrackingBehavior({ label: 'AMRAP' }),
  new SoundStateBehavior({ cues: countdownCues }),
  new ActionLayerBehavior({ actions: ['next'] }),
  new CompletionCheckBehavior(ctx => ctx.block.timerComplete)
]);
```

### Rounds Block (3 Rounds of...)

```typescript
const roundsBlock = composeBehaviors([
  new LoopStateBehavior({ totalRounds: 3, type: 'FIXED' }),
  new LoopAdvanceBehavior({ childGroups: [[1, 2]] }),
  new SpanTrackingBehavior({ label: '3 Rounds' }),
  new ActionLayerBehavior({ actions: ['next'] })
]);
```

### EMOM Block (Interval Timer)

```typescript
const emomBlock = composeBehaviors([
  new TimerLifecycleBehavior({ direction: 'down', durationMs: 60000 }),
  new TimerDisplayBehavior({ role: 'primary', label: 'EMOM' }),
  new LoopStateBehavior({ totalRounds: 10, type: 'INTERVAL' }),
  new LoopAdvanceBehavior({ childGroups: [[1]], waitForTimer: true }),
  new SpanTrackingBehavior({ label: 'EMOM 10' }),
  new SoundStateBehavior({ cues: intervalCues })
]);
```

### Effort Block (Simple Exercise)

```typescript
const effortBlock = composeBehaviors([
  new SpanTrackingBehavior({ label: '10 Pullups' }),
  new ActionLayerBehavior({ actions: ['next'] })
]);
```

### Root Block (Workout Container)

```typescript
const rootBlock = composeBehaviors([
  new WorkoutStateBehavior(),
  new IdleBlockInjector({ initialIdle: true, finalIdle: true }),
  new TimerLifecycleBehavior({ direction: 'up' }),  // Total workout timer
  new TimerDisplayBehavior({ role: 'secondary' }),
  new LoopAdvanceBehavior({ childGroups: topLevelChildren }),
  new ControlsBehavior({ buttons: ['start', 'pause', 'stop'] })
]);
```

---

## Memory Access Patterns

Each behavior reads/writes specific memory locations. This creates a clear data flow:

| Behavior | Reads | Writes |
|----------|-------|--------|
| `TimerLifecycleBehavior` | - | `timer:{blockId}` |
| `TimerDisplayBehavior` | `timer:{blockId}` | `display:timer-stack` |
| `LoopStateBehavior` | - | `loop:{blockId}` |
| `LoopAdvanceBehavior` | `loop:{blockId}` | `loop:{blockId}`, `display:rounds` |
| `SpanTrackingBehavior` | stack (parent lookup) | `span:{blockId}` |
| `SoundStateBehavior` | `timer:{blockId}` | `sound:{blockId}` |
| `WorkoutStateBehavior` | `workout:phase` | `workout:phase`, `workout:state` |
| `CompletionCheckBehavior` | varies (condition fn) | - |

---

## Behavior-by-Behavior Migration

### 1. TimerBehavior (484 LOC → ~60 LOC)

**Current Responsibilities:**
- Timer state machine (idle → running → paused → complete)
- Display stack coordination
- Segment tracking
- Sound trigger timing
- Round counter display
- Elapsed/remaining time calculation

**Proposed Simplification:**

| Current Feature | Migration Target |
|-----------------|------------------|
| Timer state machine | Inline in block, 3 states max |
| Display stack | Single `display` action |
| Segment tracking | `track` action |
| Sound triggers | `play-sound` action on state change |
| Round display | `display` action with rounds target |
| Time calculation | Pure function, not behavior |

```typescript
const timerBehavior: IBehavior = (op, ctx) => {
  const actions: IRuntimeAction[] = [];
  
  if (op === 'push') {
    actions.push(startTimer(ctx.block.id, ctx.block.duration));
    actions.push(displayAction('push', 'timer', ctx.block.timerDisplay));
    actions.push(trackAction('start', 'span', ctx.block.id));
  }
  
  if (op === 'pop') {
    actions.push(stopTimer(ctx.block.id));
    actions.push(displayAction('pop', 'timer', ctx.block.id));
    actions.push(trackAction('end', 'span', ctx.block.id));
  }
  
  return actions;
};
```

### 2. LoopCoordinatorBehavior (525 LOC → ~80 LOC)

**Current Responsibilities:**
- Child block iteration
- Round tracking (current/total)
- Repeat count management
- Child completion detection
- Re-push logic for loops

**Proposed Simplification:**

The loop coordination becomes part of the block's `next()` method rather than a separate behavior:

```typescript
class LoopBlock implements IBlock {
  private currentRound = 0;
  private readonly totalRounds: number;
  
  next(ctx: IBlockContext): IRuntimeAction[] {
    this.currentRound++;
    
    if (this.currentRound >= this.totalRounds) {
      return []; // Block is complete
    }
    
    // Re-execute children
    return [
      displayAction('update', 'rounds', { 
        current: this.currentRound, 
        total: this.totalRounds 
      }),
      trackAction('record', 'round', this.currentRound),
      ...this.pushChildren()
    ];
  }
}
```

### 3. RootLifecycleBehavior (339 LOC → ~40 LOC)

**Current Responsibilities:**
- Root block special handling
- Workout start/complete detection
- Error boundary
- Global event registration

**Proposed Simplification:**

Root block becomes a thin wrapper, not a separate behavior:

```typescript
const rootBehavior: IBehavior = (op, ctx) => {
  if (op === 'push' && ctx.isRoot) {
    return [
      displayAction('update', 'state', 'running'),
      registerHandler('tick', ctx.tickHandler)
    ];
  }
  
  if (op === 'pop' && ctx.isRoot) {
    return [
      displayAction('update', 'state', 'complete'),
      unregisterHandler('tick', ctx.tickHandler)
    ];
  }
  
  return [];
};
```

### 4. CompletionBehavior (~80 LOC → Eliminated)

**Current:** Detects when a block is "complete" based on various criteria.

**Proposed:** Move completion logic into the block's `next()` return value:

```typescript
// Instead of a separate behavior checking completion:
class TimerBlock {
  next(): IRuntimeAction[] | null {
    if (this.isComplete()) {
      return null; // null signals completion
    }
    return [...this.onTick()];
  }
}
```

### 5. HistoryBehavior (~60 LOC → Inline Track Action)

**Current:** Records execution events to history.

**Proposed:** Replace with `track` action:

```typescript
// Current
historyBehavior.onPush() → records span start
historyBehavior.onPop() → records span end

// Proposed: Inline in other behaviors
trackAction('start', 'span', blockId);
trackAction('end', 'span', blockId);
```

### 6. SoundBehavior (~50 LOC → ~20 LOC)

**Current:** Manages sound playback triggers.

**Proposed:** Direct action creation:

```typescript
const soundBehavior: IBehavior = (op, ctx) => {
  if (op === 'push' && ctx.block.sounds?.onStart) {
    return [playSoundAction(ctx.block.sounds.onStart)];
  }
  if (op === 'pop' && ctx.block.sounds?.onEnd) {
    return [playSoundAction(ctx.block.sounds.onEnd)];
  }
  return [];
};
```

### 7-11. Remaining Behaviors

| Behavior | Migration |
|----------|-----------|
| `IdleBehavior` | Merge into timer state |
| `ActionLayerBehavior` | Single `register/unregister` action |
| `PrimaryClockBehavior` | Eliminated - use single clock |
| `RuntimeControlsBehavior` | Move to UI layer |
| `TimerStateManager` | Inline in simplified timer |

---

## Composition Pattern Comparison

### Current: Class-Based Composition

```typescript
class TimerBlock extends RuntimeBlock {
  constructor() {
    super({
      behaviors: [
        new TimerBehavior(this.config),
        new HistoryBehavior(),
        new SoundBehavior(this.sounds),
        new LoopCoordinatorBehavior(this.children),
        new CompletionBehavior(this.completionCriteria),
        new ActionLayerBehavior(this.actions),
        new RuntimeControlsBehavior()
      ]
    });
  }
}
```

**Issues:**
- Constructor instantiation overhead
- Behavior interaction complexity
- Difficult to test in isolation
- Order-dependent execution

### Proposed: Functional Composition

```typescript
const timerBlock = createBlock({
  behavior: compose(
    timerBehavior,
    displayBehavior,
    soundBehavior,
    trackBehavior
  ),
  config: timerConfig
});
```

**Benefits:**
- Pure functions - easy to test
- No instantiation overhead
- Explicit composition order
- No hidden interactions

---

## Event Handling Simplification

### Current: onEvent Hook

```typescript
interface IRuntimeBehavior {
  onEvent?(event: IEvent, context: IBehaviorContext): IRuntimeAction[];
}
```

Each behavior can optionally handle events, creating a fan-out pattern:

```
Event → Block → [Behavior1, Behavior2, Behavior3] → Actions
              ↓           ↓           ↓
            handle      ignore      handle
```

### Proposed: Event Handlers Separate from Behaviors

```typescript
// Events go directly to registered handlers, not through behaviors
Event → EventHandlers → Actions → Stack/Memory/Tracker
```

Behaviors only handle lifecycle operations (`push`, `pop`, `next`), while events are handled by dedicated handlers registered via `RegisterEventHandler` action.

---

## LOC Reduction Summary

| Behavior | Current LOC | Proposed LOC | Reduction |
|----------|-------------|--------------|-----------|
| TimerBehavior | 484 | 60 | 88% |
| LoopCoordinatorBehavior | 525 | 80 | 85% |
| RootLifecycleBehavior | 339 | 40 | 88% |
| CompletionBehavior | 80 | 0 | 100% |
| HistoryBehavior | 60 | 0 (inline) | 100% |
| SoundBehavior | 50 | 20 | 60% |
| IdleBehavior | 40 | 0 (merged) | 100% |
| ActionLayerBehavior | 100 | 20 | 80% |
| PrimaryClockBehavior | 60 | 0 (eliminated) | 100% |
| RuntimeControlsBehavior | 120 | 0 (UI layer) | 100% |
| TimerStateManager | 150 | 0 (inline) | 100% |
| **Total** | **~2,008** | **~220** | **89%** |

---

## Migration Phases

### Phase 1: Create Functional Behavior Interface

```typescript
// New simplified interface
type IBehavior = (op: BlockOperation, ctx: IBehaviorContext) => IRuntimeAction[];

type BlockOperation = 'push' | 'pop' | 'next';
```

### Phase 2: Create Adapter Layer

```typescript
// Adapter to run old behaviors through new interface
function adaptBehavior(oldBehavior: IRuntimeBehavior): IBehavior {
  return (op, ctx) => {
    switch (op) {
      case 'push': return oldBehavior.onPush(ctx);
      case 'pop': return oldBehavior.onPop(ctx);
      case 'next': return oldBehavior.onNext(ctx);
    }
  };
}
```

### Phase 3: Migrate Behaviors Incrementally

1. Start with lowest-complexity behaviors (Sound, History)
2. Move to medium complexity (ActionLayer, Controls)
3. Finally tackle high complexity (Timer, LoopCoordinator)

### Phase 4: Remove Adapter Layer

Once all behaviors are migrated, remove the adapter and old `IRuntimeBehavior` interface.

---

## Testing Strategy

### Current Behavior Testing

- Requires full block context
- Mock multiple dependencies
- Test each lifecycle hook separately
- Integration tests for behavior combinations

### Proposed Behavior Testing

```typescript
// Pure function testing
describe('timerBehavior', () => {
  it('returns start timer action on push', () => {
    const ctx = createMockContext({ blockId: 'test-1' });
    const actions = timerBehavior('push', ctx);
    
    expect(actions).toContainEqual(
      expect.objectContaining({ type: 'start-timer' })
    );
  });
  
  it('returns stop timer action on pop', () => {
    const ctx = createMockContext({ blockId: 'test-1' });
    const actions = timerBehavior('pop', ctx);
    
    expect(actions).toContainEqual(
      expect.objectContaining({ type: 'stop-timer' })
    );
  });
});
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Complex behavior interactions | Create comprehensive integration tests before refactoring |
| Timer edge cases | Document all timer states and transitions first |
| Loop iteration bugs | Snapshot test current loop behavior outputs |
| Sound timing changes | User acceptance testing for audio cues |

---

*Document generated: December 2024*
*Reference: [simplify-engine.md](./simplify-engine.md)*
