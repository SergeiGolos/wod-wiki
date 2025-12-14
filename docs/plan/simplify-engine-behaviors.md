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
      return [displayAction('pop', context.block.id)];
    default:
      return [];
  }
};

/**
 * Composed block behavior
 */
const timerBlockBehavior = createBehavior(
  timerBehavior,
  displayBehavior,
  trackBehavior
);
```

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
