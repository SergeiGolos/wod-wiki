# Timestamp Propagation in Next Event Chain

> **Status:** ✅ IMPLEMENTED (Approach 5 - Snapshot Clock)  
> **Date:** 2026-01-29 (Updated: 2026-01-30)  
> **Author:** Engineering Analysis

## Implementation Summary

**Approach 5 (Snapshot Clock)** has been fully implemented across the following phases:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | SnapshotClock class | ✅ Complete (17 tests) |
| 2 | BlockLifecycleOptions.clock property | ✅ Complete |
| 3 | RuntimeBlock lifecycle methods | ✅ Complete |
| 4 | ScriptRuntime.popBlock() | ✅ Complete |
| 5 | PushBlockAction clock propagation | ✅ Complete |
| 6 | ScriptRuntime.pushBlock() | ✅ Complete |
| 7 | NextAction snapshot creation | ✅ Complete |
| 8 | Integration tests | ✅ Complete (6 tests) |

### Key Files Modified

- `src/runtime/RuntimeClock.ts` - Added `SnapshotClock` class
- `src/runtime/contracts/IRuntimeBlock.ts` - Added `clock?: IRuntimeClock` to `BlockLifecycleOptions`
- `src/runtime/RuntimeBlock.ts` - Updated lifecycle methods to use `options.clock`
- `src/runtime/ScriptRuntime.ts` - Creates SnapshotClock in `popBlock()`, propagates through lifecycle
- `src/runtime/actions/stack/PushBlockAction.ts` - Uses clock from options
- `src/runtime/actions/stack/NextAction.ts` - Creates SnapshotClock for user-triggered next
- `src/testing/harness/MockBlock.ts` - Added MockBehaviorContext, supports new behavior API

### How It Works

When a block completes:
1. `popBlock()` creates a `SnapshotClock.at(clock, completedAt)` that freezes `now`
2. The snapshot is passed via `lifecycleOptions.clock` to all lifecycle methods
3. `unmount()`, `parent.next()`, and any child `mount()` all see the same frozen time
4. Behaviors access `ctx.clock.now` which returns the frozen timestamp

---

## Executive Summary

This document analyzes how timestamps flow through the runtime system when a `next` event triggers block completion and parent notification. The core problem: **when a timer completes at time T, the parent block's `next()` is called, and if the parent pushes a new child, that child should begin at time T—not at the time the action queue processes the push.**

This is critical for accurate workout timing where a sequence like:

```
3:00 Run       # Timer A
1:00 Rest      # Timer B
```

...should have Timer B start at exactly the moment Timer A ends, not a few milliseconds later when the action queue gets around to pushing it.

---

## Current Architecture Analysis

### The Next Event Flow

```
Timer expires (tick subscription detects elapsed >= duration)
    │
    ▼
TimerCompletionBehavior.onMount subscription callback
    │  ctx.markComplete('timer-expired')
    │  ctx.emitEvent({ name: 'timer:complete', timestamp: ctx.clock.now, ... })
    │
    ▼
RuntimeBlock is marked isComplete = true
    │
    ▼
ScriptRuntime.sweepCompletedBlocks() detects completed block
    │
    ▼
ScriptRuntime.popBlock() orchestrates:
    1. currentBlock.unmount(runtime, { completedAt })
    2. stack.pop()
    3. Event dispatch (stack:pop)
    4. Execute unmount actions
    5. Dispose and cleanup
    6. parent.next(runtime, { completedAt })  ← TIMESTAMP PASSED HERE
    7. Emit output statement
    │
    ▼
Parent block's next() receives { completedAt } in options
    │  Behaviors iterate: behavior.onNext(ctx)
    │
    ▼
ChildRunnerBehavior.onNext() returns [PushChildBlockAction(nextChild)]
    │
    ▼
PushBlockAction.do(runtime) executes:
    │  startTime = this.options.startTime ?? runtime.clock.now  ← PROBLEM!
    │
    ▼
Child block mounted with startTime = clock.now (NOT completedAt!)
```

### The Gap

The `completedAt` timestamp from the popped child is passed to `parent.next()` via `BlockLifecycleOptions`, but:

1. **`onNext` behaviors receive `ctx` (IBehaviorContext)**, not the options
2. **IBehaviorContext has no access to `BlockLifecycleOptions`**
3. **Actions returned by `onNext` don't carry the trigger timestamp**
4. **`PushBlockAction` uses `clock.now` as fallback**

This creates a timing gap between:
- **T₁** = when the child timer actually expired
- **T₂** = when the new child gets pushed and mounted

---

## Problem Statement

When a `next` event chains through the system:

1. A timer block completes at **T₁** (`timer-expired`)
2. Parent's `next()` is called with `{ completedAt: T₁ }`
3. Parent's `ChildRunnerBehavior.onNext()` pushes the next child
4. The new child's timer starts at **T₂** (action execution time)

**Impact:** Accumulated drift over multiple segments. A 10-segment workout with 5ms drift per transition loses 50ms of accuracy.

---

## Proposed Solutions

### Approach 1: Extend IBehaviorContext with Trigger Timestamp

**Concept:** Add a `triggerTimestamp` property to `IBehaviorContext` that captures the timestamp that initiated the current lifecycle phase.

#### Implementation Changes

```typescript
// IBehaviorContext additions
interface IBehaviorContext {
    // ... existing properties ...
    
    /**
     * The timestamp that triggered the current lifecycle phase.
     * - For onMount: the startTime from BlockLifecycleOptions
     * - For onNext: the completedAt from the child pop, or user action timestamp
     * - For onUnmount: the completedAt from BlockLifecycleOptions
     */
    readonly triggerTimestamp?: Date;
}

// BehaviorContext constructor update
class BehaviorContext implements IBehaviorContext {
    constructor(
        readonly block: IRuntimeBlock,
        readonly clock: IRuntimeClock,
        readonly stackLevel: number,
        private runtime: IScriptRuntime,
        readonly triggerTimestamp?: Date  // NEW
    ) { }
}

// RuntimeBlock.next() passes options to context
next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (!this._behaviorContext) {
        console.warn('[RuntimeBlock] next() called before mount()');
        return [];
    }

    // Create a context with trigger timestamp for this next() call
    const nextContext = new BehaviorContext(
        this,
        runtime.clock,
        this._behaviorContext.stackLevel,
        runtime,
        options?.completedAt ?? options?.now  // Trigger timestamp
    );

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        if (behavior.onNext) {
            const result = behavior.onNext(nextContext);
            if (result) {
                actions.push(...result);
            }
        }
    }

    return actions;
}
```

#### Behavior Usage

```typescript
// ChildRunnerBehavior can now propagate the timestamp
class ChildRunnerBehavior implements IRuntimeBehavior {
    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.childIndex < this.config.childGroups.length) {
            const nextGroup = this.config.childGroups[this.childIndex];
            this.childIndex++;
            
            // Pass trigger timestamp to child
            return [new PushChildBlockAction(nextGroup, {
                startTime: ctx.triggerTimestamp  // Chain the timestamp!
            })];
        }
        return [];
    }
}
```

#### Pros

| Benefit | Description |
|---------|-------------|
| **Clean API** | Single property exposes the trigger time |
| **Backward compatible** | Optional property, existing behaviors unaffected |
| **Type-safe** | TypeScript enforces correct usage |
| **Explicit** | Clear what the timestamp represents |

#### Cons

| Drawback | Description |
|----------|-------------|
| **Context multiplication** | Creates new BehaviorContext per `next()` call |
| **Memory pressure** | More short-lived objects |
| **Partial solution** | Only covers `next()`, not other event-driven flows |
| **Requires behavior updates** | All child-pushing behaviors must be updated |

#### Risk Assessment

- **Low risk**: Non-breaking change, additive API
- **Medium effort**: Requires updating BehaviorContext creation in 3 places
- **Testing**: Existing tests should pass; new tests for timestamp propagation

---

### Approach 2: Action Metadata with Execution Context

**Concept:** Extend `IRuntimeAction` with optional execution context that carries timing metadata through the action queue.

#### Implementation Changes

```typescript
// IRuntimeAction extension
interface IRuntimeAction {
    readonly type: string;
    readonly target?: string;
    readonly payload?: unknown;
    
    /**
     * Execution context carried through the action queue.
     * Preserves causality chain for timing-sensitive operations.
     */
    readonly executionContext?: ActionExecutionContext;
    
    do(runtime: IScriptRuntime): void;
}

interface ActionExecutionContext {
    /** The timestamp that triggered this action chain */
    triggerTimestamp?: Date;
    /** The source event name */
    sourceEvent?: string;
    /** The source block key */
    sourceBlockKey?: string;
}

// PushBlockAction respects execution context
class PushBlockAction implements IRuntimeAction {
    constructor(
        public readonly block: IRuntimeBlock,
        private readonly options: BlockLifecycleOptions = {},
        public readonly executionContext?: ActionExecutionContext
    ) { }

    do(runtime: IScriptRuntime): void {
        // Prefer execution context timestamp over clock.now
        let startTime = this.options.startTime 
            ?? this.executionContext?.triggerTimestamp 
            ?? runtime.clock.now;
        
        // ... rest of push logic
    }
}
```

#### Action Factory Pattern

```typescript
// Behaviors return actions with context
class ChildRunnerBehavior implements IRuntimeBehavior {
    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.childIndex < this.config.childGroups.length) {
            return [new PushChildBlockAction(nextGroup, {}, {
                triggerTimestamp: ctx.triggerTimestamp,
                sourceEvent: 'child-complete',
                sourceBlockKey: ctx.block.key.toString()
            })];
        }
        return [];
    }
}
```

#### Pros

| Benefit | Description |
|---------|-------------|
| **Action self-contained** | Each action carries its execution context |
| **Debuggable** | Can trace action causality chain |
| **Queue-friendly** | Context survives action queuing |
| **Extensible** | Can add more context (priority, cancellation, etc.) |

#### Cons

| Drawback | Description |
|----------|-------------|
| **Interface change** | Modifies core `IRuntimeAction` interface |
| **Widespread impact** | All actions need updating for consistency |
| **Boilerplate** | Every action creation must pass context |
| **Memory overhead** | Every action carries context object |

#### Risk Assessment

- **Medium risk**: Interface change affects all action implementations
- **High effort**: 15+ action classes need updates
- **Testing**: Requires comprehensive action execution tests

---

### Approach 3: Runtime-Level Execution Context (Thread-Local Pattern)

**Concept:** The runtime maintains a "current execution context" that tracks the trigger timestamp for the current processing cycle. All operations within that cycle inherit the context.

#### Implementation Changes

```typescript
// ScriptRuntime additions
class ScriptRuntime implements IScriptRuntime {
    private _executionContext: ExecutionContext | null = null;

    /**
     * Current execution context for the processing cycle.
     * Set during event handling and action processing.
     */
    get executionContext(): ExecutionContext | null {
        return this._executionContext;
    }

    /**
     * Execute a function within an execution context.
     * Actions executed within inherit this context.
     */
    withContext<T>(context: ExecutionContext, fn: () => T): T {
        const previous = this._executionContext;
        this._executionContext = context;
        try {
            return fn();
        } finally {
            this._executionContext = previous;
        }
    }

    // Updated popBlock
    popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
        const completedAt = options.completedAt ?? this.clock.now;
        
        // ... existing pop logic ...

        // Call parent.next() within execution context
        const parent = this.stack.current;
        if (parent) {
            this.withContext({ triggerTimestamp: completedAt }, () => {
                const nextActions = parent.next(this, lifecycleOptions);
                this.queueActions(nextActions);
            });
        }
        
        // ... rest of pop logic ...
    }
}

interface ExecutionContext {
    triggerTimestamp?: Date;
    sourceEvent?: string;
    depth?: number;
}
```

#### Action Usage

```typescript
// PushBlockAction automatically uses runtime context
class PushBlockAction implements IRuntimeAction {
    do(runtime: IScriptRuntime): void {
        let startTime = this.options.startTime 
            ?? runtime.executionContext?.triggerTimestamp
            ?? runtime.clock.now;
        
        // ... push with startTime
    }
}
```

#### Pros

| Benefit | Description |
|---------|-------------|
| **Transparent** | Behaviors don't need to explicitly pass context |
| **Centralized** | Single point of context management |
| **Stack-safe** | Properly scoped with `withContext` |
| **Zero behavior changes** | Existing behaviors work unchanged |

#### Cons

| Drawback | Description |
|----------|-------------|
| **Implicit state** | Hidden dependency on runtime context |
| **Testing complexity** | Must set up context for unit tests |
| **Threading concerns** | Problematic if runtime becomes async |
| **Debug opacity** | Harder to trace where timestamp came from |

#### Risk Assessment

- **Medium risk**: Introduces implicit state, but contained to runtime
- **Low effort**: Only runtime and key actions need changes
- **Testing**: Test harness needs context setup helpers

---

### Approach 4: Event-Sourced Timing with Completion Events

**Concept:** Rather than pushing timestamps through the call chain, use event sourcing. When a block completes, emit a `block:completed` event with the timestamp. When pushing a new block, query the most recent completion event.

#### Implementation Changes

```typescript
// CompletionEventStore in ScriptRuntime
class ScriptRuntime implements IScriptRuntime {
    private _lastCompletionTimestamp: Date | null = null;

    /**
     * Record a block completion timestamp.
     * Used by PushBlockAction to determine start time for chained blocks.
     */
    recordCompletion(timestamp: Date): void {
        this._lastCompletionTimestamp = timestamp;
    }

    /**
     * Consume the last completion timestamp.
     * Returns null if no recent completion, or if already consumed.
     */
    consumeCompletionTimestamp(): Date | null {
        const ts = this._lastCompletionTimestamp;
        this._lastCompletionTimestamp = null;
        return ts;
    }

    // Updated popBlock
    popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
        const completedAt = options.completedAt ?? this.clock.now;
        
        // Record completion for next push
        this.recordCompletion(completedAt);
        
        // ... existing pop logic ...
    }
}
```

#### Action Usage

```typescript
// PushBlockAction consumes completion timestamp
class PushBlockAction implements IRuntimeAction {
    do(runtime: IScriptRuntime): void {
        // Try to use recent completion timestamp (for chained pushes)
        let startTime = this.options.startTime 
            ?? runtime.consumeCompletionTimestamp()
            ?? runtime.clock.now;
        
        // ... push with startTime
    }
}
```

#### Pros

| Benefit | Description |
|---------|-------------|
| **Simple implementation** | Just two methods on runtime |
| **No interface changes** | Behaviors unchanged |
| **Automatic** | Chained blocks automatically get correct timestamp |
| **Low overhead** | Single Date reference |

#### Cons

| Drawback | Description |
|----------|-------------|
| **Consume-once semantics** | Only first push after completion gets the timestamp |
| **Order-dependent** | Multiple pushes in same `next()` may not all get timestamp |
| **Race conditions** | Could consume wrong timestamp if events interleave |
| **Not composable** | Doesn't handle nested completion chains well |

#### Risk Assessment

- **High risk**: Consume-once semantics are fragile
- **Low effort**: Simple to implement
- **Testing**: Need tests for multi-push and interleaved scenarios

---

### Approach 5: Snapshot Clock (Frozen Time During Execution Chain) ⭐ RECOMMENDED

**Concept:** Leverage the existing `IRuntimeClock` interface that's already threaded throughout the system. When an execution chain starts (e.g., timer completes → pop → parent.next → push child), create a "snapshot clock" that freezes `now` at the trigger timestamp. All code that uses `ctx.clock.now` or `runtime.clock.now` automatically sees the frozen time until the action queue is empty.

This is elegant because:
1. **Reuses existing infrastructure** - behaviors already use `ctx.clock.now`
2. **Completely transparent** - zero API changes for behaviors
3. **Naturally scopes to execution chain** - snapshot lives only during action processing

#### Implementation Changes

```typescript
/**
 * SnapshotClock wraps an IRuntimeClock and freezes `now` at a specific timestamp.
 * All other properties delegate to the underlying clock.
 */
class SnapshotClock implements IRuntimeClock {
    constructor(
        private readonly _underlying: IRuntimeClock,
        private readonly _frozenTime: Date
    ) {}

    /** Always returns the frozen timestamp */
    get now(): Date {
        return this._frozenTime;
    }

    /** Delegate to underlying clock */
    get elapsed(): number {
        return this._underlying.elapsed;
    }

    get isRunning(): boolean {
        return this._underlying.isRunning;
    }

    get spans(): ReadonlyArray<TimeSpan> {
        return this._underlying.spans;
    }

    start(): Date {
        return this._underlying.start();
    }

    stop(): Date {
        return this._underlying.stop();
    }
}
```

#### Runtime Integration

```typescript
class ScriptRuntime implements IScriptRuntime {
    private _realClock: IRuntimeClock;
    private _activeClock: IRuntimeClock;

    /** The clock exposed to the rest of the system */
    get clock(): IRuntimeClock {
        return this._activeClock;
    }

    /**
     * Execute an action chain with time frozen at the trigger timestamp.
     * All actions in the chain see the same `clock.now`.
     */
    private executeWithFrozenTime<T>(triggerTime: Date, fn: () => T): T {
        const snapshot = new SnapshotClock(this._realClock, triggerTime);
        const previousClock = this._activeClock;
        this._activeClock = snapshot;
        try {
            return fn();
        } finally {
            this._activeClock = previousClock;
        }
    }

    // Updated popBlock
    popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
        const completedAt = options.completedAt ?? this._realClock.now;
        
        // Freeze time for the entire pop → parent.next() → child push chain
        return this.executeWithFrozenTime(completedAt, () => {
            // ... existing pop logic ...
            
            // parent.next() and any pushed children all see completedAt as clock.now
            const parent = this.stack.current;
            if (parent) {
                const nextActions = parent.next(this, { completedAt });
                this.queueActions(nextActions);
            }
            
            // ... rest of pop logic ...
        });
    }

    // Updated action processing
    private processActions() {
        // Actions queued during frozen time continue to see frozen time
        // because _activeClock is still the snapshot
        while (this._actionQueue.length > 0) {
            const action = this._actionQueue.shift();
            action?.do(this);
        }
    }
}
```

#### How It Works - Flow Diagram

```
Timer expires at T=180000ms
    │
    ▼
TimerCompletionBehavior marks block complete
    │
    ▼
sweepCompletedBlocks() calls popBlock({ completedAt: T=180000 })
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ executeWithFrozenTime(T=180000, () => {                         │
│                                                                 │
│   runtime.clock.now → always returns T=180000                   │
│                                                                 │
│   1. unmount() - ctx.clock.now = T=180000                       │
│   2. stack.pop()                                                │
│   3. parent.next() - ctx.clock.now = T=180000                   │
│   4. ChildRunnerBehavior.onNext() returns PushChildBlockAction  │
│   5. processActions() - still frozen                            │
│   6. PushBlockAction.do() - runtime.clock.now = T=180000        │
│   7. Child block mounted with startTime = T=180000 ✓            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
Action queue empty → executeWithFrozenTime returns
    │
    ▼
_activeClock restored to _realClock
    │
    ▼
Next tick event: clock.now returns real wall time again
```

#### Existing Code - Zero Changes Required

```typescript
// TimerInitBehavior - NO CHANGES
onMount(ctx: IBehaviorContext): IRuntimeAction[] {
    const now = ctx.clock.now.getTime();  // ← Automatically gets frozen time!
    ctx.setMemory('timer', {
        direction: this.config.direction,
        spans: [new TimeSpan(now)],  // ← Timer starts at exact completion time
        // ...
    });
}

// PushBlockAction - NO CHANGES
do(runtime: IScriptRuntime): void {
    let startTime = this.options.startTime ?? runtime.clock.now;  // ← Frozen time!
    // ... push with correct startTime
}

// ChildRunnerBehavior - NO CHANGES
onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    // Just return the action, clock freezing is automatic
    return [new PushChildBlockAction(nextGroup)];
}
```

#### Scoping Rules

| Trigger | Freeze Point | Scope |
|---------|--------------|-------|
| Timer expiry (`timer-expired`) | `completedAt` from tick detection | pop → parent.next → all queued actions |
| User advance (`next` event) | Event timestamp | NextAction → block.next → all queued actions |
| Round complete | `completedAt` from child pop | pop → parent.next → push next round |
| Manual pop | `completedAt` option or clock.now | pop chain only |

#### Nested Freezing

If a child push triggers immediate completion (zero-duration timer), the outer freeze is maintained:

```typescript
// Outer freeze at T=180000
executeWithFrozenTime(T=180000, () => {
    // Push zero-duration timer
    pushBlock(zeroTimer);  // mounts with T=180000
    
    // Zero timer marks complete immediately
    sweepCompletedBlocks();  // pops zeroTimer
    
    // Inner "freeze" just continues using outer snapshot
    // No nested clock switching needed - already frozen!
    
    parent.next();  // still sees T=180000
    pushBlock(nextChild);  // starts at T=180000
});
```

#### Pros

| Benefit | Description |
|---------|-------------|
| **Zero behavior changes** | All existing code works unchanged |
| **Zero action changes** | PushBlockAction, NextAction, etc. unchanged |
| **Zero API changes** | IRuntimeClock, IBehaviorContext unchanged |
| **Naturally scoped** | Freeze only lasts during action chain |
| **Transparent** | Behaviors don't know time is frozen |
| **Testable** | Mock clock already works the same way |
| **Handles multi-push** | All pushes in same chain get same time |
| **Handles nesting** | Outer freeze covers inner operations |

#### Cons

| Drawback | Description |
|----------|-------------|
| **Implicit behavior** | Could surprise developers expecting real time |
| **Elapsed time calculation** | `clock.elapsed` still advances (delegates to real clock) |
| **Logging confusion** | Logs during frozen time all show same timestamp |
| **Debug timing** | Harder to see actual wall-clock execution time |

#### Edge Cases & Mitigations

| Edge Case | Behavior | Mitigation |
|-----------|----------|------------|
| Long-running action | Actions all see frozen time | Acceptable - action chains should be fast |
| External async calls | Would see frozen time | Document: don't use clock for external timing |
| Timer duration checks | Use frozen time for consistency | Correct - timer expiry is deterministic |
| UI updates during processing | UI sees frozen time | UI should debounce; freeze is < 1ms typically |

#### Risk Assessment

- **Very low risk**: Non-breaking, transparent change
- **Low effort**: SnapshotClock wrapper + 2 method changes in ScriptRuntime
- **Testing**: Existing tests pass unchanged; add freeze-specific tests

---

## Comparison Matrix

| Criteria | Approach 1: Context Property | Approach 2: Action Metadata | Approach 3: Runtime Context | Approach 4: Event-Sourced | **Approach 5: Snapshot Clock** |
|----------|------------------------------|----------------------------|----------------------------|---------------------------|-------------------------------|
| **Implementation Effort** | Medium | High | Low | Low | **Very Low** |
| **API Changes** | IBehaviorContext | IRuntimeAction | IScriptRuntime | IScriptRuntime | **None** |
| **Behavior Changes** | Yes (child pushers) | Yes (all actions) | No | No | **No** |
| **Explicit/Implicit** | Explicit | Explicit | Implicit | Implicit | **Implicit** |
| **Multi-push Support** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ First only | **✅ Yes** |
| **Testability** | High | High | Medium | Medium | **High** |
| **Debug Traceability** | High | High | Low | Low | **Medium** |
| **Memory Overhead** | Medium | High | Low | Low | **Very Low** |
| **Future Async Safety** | ✅ Yes | ✅ Yes | ⚠️ Needs care | ⚠️ Needs care | **⚠️ Needs care** |
| **Leverages Existing Code** | Partial | Partial | No | No | **✅ Fully** |

| Criteria | Approach 1: Context Property | Approach 2: Action Metadata | Approach 3: Runtime Context | Approach 4: Event-Sourced |
|----------|------------------------------|----------------------------|----------------------------|---------------------------|
| **Implementation Effort** | Medium | High | Low | Low |
| **API Changes** | IBehaviorContext | IRuntimeAction | IScriptRuntime | IScriptRuntime |
| **Behavior Changes** | Yes (child pushers) | Yes (all actions) | No | No |
| **Explicit/Implicit** | Explicit | Explicit | Implicit | Implicit |
| **Multi-push Support** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ First only |
| **Testability** | High | High | Medium | Medium |
| **Debug Traceability** | High | High | Low | Low |
| **Memory Overhead** | Medium | High | Low | Low |
| **Future Async Safety** | ✅ Yes | ✅ Yes | ⚠️ Needs care | ⚠️ Needs care |

---

## Recommendation

### Primary: Approach 5 (Snapshot Clock) ⭐

**Rationale:**

1. **Zero code changes to behaviors**: All existing behaviors automatically benefit
2. **Zero code changes to actions**: PushBlockAction, NextAction, etc. work unchanged
3. **Leverages existing infrastructure**: `ctx.clock.now` and `runtime.clock.now` are already used everywhere
4. **Naturally scoped**: Freeze only lasts during the execution chain
5. **Lowest risk**: Transparent, non-breaking change
6. **Lowest effort**: Just a wrapper class + 2 method updates in ScriptRuntime
7. **Handles all edge cases**: Multi-push, nesting, zero-duration timers all work

**Why not the others?**

| Approach | Why Not Primary |
|----------|-----------------|
| Approach 1 (Context Property) | Requires updating all child-pushing behaviors |
| Approach 2 (Action Metadata) | Requires updating all 15+ action classes |
| Approach 3 (Runtime Context) | Similar to Approach 5 but requires explicit context passing |
| Approach 4 (Event-Sourced) | Fragile consume-once semantics, doesn't handle multi-push |

### Secondary: Approach 1 (IBehaviorContext Extension)

If explicit timestamp access is needed for specific behaviors (e.g., logging the trigger time), Approach 1 can be added alongside Approach 5:

```typescript
// BehaviorContext can expose the frozen time explicitly if needed
class BehaviorContext implements IBehaviorContext {
    get triggerTimestamp(): Date {
        return this.clock.now;  // Returns frozen time during execution chain
    }
}
```

This gives behaviors explicit access while still benefiting from automatic freezing.

---

## Implementation Plan (Refined)

### Design Decision: Clock as Lifecycle Parameter

Instead of swapping clocks at the runtime level, we pass `IRuntimeClock` explicitly through lifecycle methods. This makes clock propagation:

- **Explicit**: The clock is a visible parameter, not hidden state
- **Event-driven**: Events create and pass snapshot clocks when triggering `next()`
- **Composable**: Nested operations naturally inherit the passed clock
- **Testable**: Tests can verify which clock was passed

### Phase 1: SnapshotClock Class

**File:** [src/runtime/RuntimeClock.ts](../src/runtime/RuntimeClock.ts)  
**Estimated effort:** 30 minutes

```typescript
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { TimeSpan } from './models/TimeSpan';

/**
 * SnapshotClock wraps an IRuntimeClock and freezes `now` at a specific timestamp.
 * Used to ensure consistent timing during execution chains (pop → next → push).
 * 
 * All other properties and methods delegate to the underlying clock.
 */
export class SnapshotClock implements IRuntimeClock {
    constructor(
        private readonly _underlying: IRuntimeClock,
        private readonly _frozenTime: Date
    ) {}

    /** Always returns the frozen timestamp */
    get now(): Date {
        return this._frozenTime;
    }

    /** Delegate to underlying clock */
    get elapsed(): number {
        return this._underlying.elapsed;
    }

    get isRunning(): boolean {
        return this._underlying.isRunning;
    }

    get spans(): ReadonlyArray<TimeSpan> {
        return this._underlying.spans;
    }

    start(): Date {
        return this._underlying.start();
    }

    stop(): Date {
        return this._underlying.stop();
    }

    /**
     * Create a snapshot of a clock at a specific time.
     * Factory method for cleaner creation.
     */
    static at(clock: IRuntimeClock, time: Date): SnapshotClock {
        return new SnapshotClock(clock, time);
    }

    /**
     * Create a snapshot at the clock's current time.
     * Useful for freezing "now" before starting an execution chain.
     */
    static now(clock: IRuntimeClock): SnapshotClock {
        return new SnapshotClock(clock, clock.now);
    }
}
```

**Tests:** [tests/lifecycle/SnapshotClock.test.ts](../tests/lifecycle/SnapshotClock.test.ts)

```typescript
describe('SnapshotClock', () => {
    it('should return frozen time from now property', () => {
        const realClock = new RuntimeClock();
        const frozenTime = new Date('2024-01-01T12:00:00Z');
        const snapshot = SnapshotClock.at(realClock, frozenTime);
        
        expect(snapshot.now).toEqual(frozenTime);
    });

    it('should delegate elapsed/isRunning/spans to underlying clock', () => {
        const realClock = new RuntimeClock();
        realClock.start();
        const snapshot = SnapshotClock.now(realClock);
        
        expect(snapshot.isRunning).toBe(true);
        expect(snapshot.spans.length).toBe(1);
    });

    it('should not change now even after underlying clock advances', () => {
        const mockClock = createMockClock(new Date('2024-01-01T12:00:00Z'));
        const snapshot = SnapshotClock.now(mockClock);
        
        mockClock.advance(5000);
        
        expect(snapshot.now.getTime()).toBe(new Date('2024-01-01T12:00:00Z').getTime());
        expect(mockClock.now.getTime()).toBe(new Date('2024-01-01T12:00:05Z').getTime());
    });
});
```

---

### Phase 2: Extend BlockLifecycleOptions with Clock

**File:** [src/runtime/contracts/IRuntimeBlock.ts](../src/runtime/contracts/IRuntimeBlock.ts)  
**Estimated effort:** 15 minutes

```typescript
import { IRuntimeClock } from './IRuntimeClock';

export interface BlockLifecycleOptions {
    /** Start timestamp when the block was pushed onto the stack. */
    startTime?: Date;
    /** Completion timestamp when the block was popped from the stack. */
    completedAt?: Date;
    /** Current timestamp for the operation (onNext, etc). */
    now?: Date;
    
    /**
     * Clock to use for this lifecycle operation.
     * If provided, this clock is passed to behaviors and child operations.
     * If not provided, defaults to runtime.clock.
     * 
     * Use SnapshotClock to freeze time during execution chains.
     */
    clock?: IRuntimeClock;
}
```

**Rationale:** Adding `clock` to the existing options interface is:
- Backward compatible (optional property)
- Follows existing patterns (options already has timing fields)
- Natural fallback: `options.clock ?? runtime.clock`

---

### Phase 3: Update RuntimeBlock Lifecycle Methods

**File:** [src/runtime/RuntimeBlock.ts](../src/runtime/RuntimeBlock.ts)  
**Estimated effort:** 1 hour

#### 3.1 Update mount() to use provided clock

```typescript
mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Use provided clock or fall back to runtime clock
    const clock = options?.clock ?? runtime.clock;
    
    // Create behavior context with the appropriate clock
    this._behaviorContext = new BehaviorContext(
        this,
        clock,  // Use the passed clock
        runtime.stack.count - 1,
        runtime
    );

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        if (behavior.onMount) {
            const result = behavior.onMount(this._behaviorContext);
            if (result) {
                actions.push(...result);
            }
        }
    }

    return actions;
}
```

#### 3.2 Update next() to use provided clock

```typescript
next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (!this._behaviorContext) {
        console.warn('[RuntimeBlock] next() called before mount()');
        return [];
    }

    // Use provided clock or fall back to existing context clock
    const clock = options?.clock ?? this._behaviorContext.clock;
    
    // Create a fresh context for this next() call with the appropriate clock
    const nextContext = new BehaviorContext(
        this,
        clock,
        this._behaviorContext.stackLevel,
        runtime
    );

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        if (behavior.onNext) {
            const result = behavior.onNext(nextContext);
            if (result) {
                actions.push(...result);
            }
        }
    }

    return actions;
}
```

#### 3.3 Update unmount() to use provided clock

```typescript
unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (!this._behaviorContext) {
        return [];
    }

    // Use provided clock or fall back to existing context clock
    const clock = options?.clock ?? this._behaviorContext.clock;
    
    // Create context with appropriate clock for unmount
    const unmountContext = new BehaviorContext(
        this,
        clock,
        this._behaviorContext.stackLevel,
        runtime
    );

    const actions: IRuntimeAction[] = [];
    for (const behavior of this.behaviors) {
        if (behavior.onUnmount) {
            const result = behavior.onUnmount(unmountContext);
            if (result) {
                actions.push(...result);
            }
        }
    }

    return actions;
}
```

---

### Phase 4: Update ScriptRuntime.popBlock() to Create and Propagate Snapshot

**File:** [src/runtime/ScriptRuntime.ts](../src/runtime/ScriptRuntime.ts)  
**Estimated effort:** 45 minutes

This is the key integration point where we create the snapshot clock and thread it through the chain.

```typescript
import { SnapshotClock } from './RuntimeClock';

public popBlock(options: BlockLifecycleOptions = {}): IRuntimeBlock | undefined {
    const currentBlock = this.stack.current;
    this.log(`[RT] popBlock: current=${currentBlock?.label}`);
    if (!currentBlock) {
        return undefined;
    }

    // Capture stack level before pop
    const stackLevelBeforePop = this.stack.count - 1;

    // Determine completion time and create snapshot clock
    const completedAt = options.completedAt ?? this.clock.now;
    const snapshotClock = options.clock ?? SnapshotClock.at(this.clock, completedAt);
    
    // Lifecycle options with frozen clock
    const lifecycleOptions: BlockLifecycleOptions = {
        ...options,
        completedAt,
        clock: snapshotClock  // All downstream operations use this clock
    };

    this.setCompletedTime(currentBlock, completedAt);
    this._hooks.onBeforePop?.(currentBlock);

    // 1. Unmount with snapshot clock
    const unmountActions = currentBlock.unmount(this, lifecycleOptions) ?? [];
    this.log(`[RT] popBlock: unmount returned ${unmountActions.length} actions`);

    // 2. Pop from stack
    const popped = this.stack.pop();
    if (!popped) {
        return undefined;
    }
    this.log(`[RT] popBlock: popped ${popped.label}`);

    // 3. Dispatch pop event
    this.eventBus.dispatch(new StackPopEvent(this.stack.blocks), this);

    const ownerKey = this.resolveOwnerKey(popped);

    // 4. End tracking span
    this._tracker.endSpan?.(ownerKey);

    // 5. Execute unmount actions with snapshot clock context
    this.executeActionsWithClock(unmountActions, snapshotClock);

    // 6. Dispose and cleanup
    popped.dispose(this);
    popped.context?.release?.();
    this._hooks.unregisterByOwner?.(ownerKey);
    this._wrapper.cleanup?.(popped);

    this._logger.debug?.('runtime.popBlock', {
        blockKey: ownerKey,
        stackDepth: this.stack.count,
    });

    // 7. Call parent.next() WITH the snapshot clock
    const parent = this.stack.current;
    this.log(`[RT] popBlock: calling parent.next() on ${parent?.label}`);
    if (parent) {
        // Parent receives the same snapshot clock
        const nextActions = parent.next(this, lifecycleOptions) ?? [];
        this.log(`[RT] popBlock: parent.next() returned ${nextActions.length} actions`);
        
        // Queue actions - they will be executed with snapshot clock awareness
        this.queueActionsWithClock(nextActions, snapshotClock);
    }

    // 8. Emit output statement
    this.emitOutputStatement(popped, stackLevelBeforePop);

    this._hooks.onAfterPop?.(popped);

    return popped;
}

/**
 * Execute actions immediately, passing clock through to any push operations.
 */
private executeActionsWithClock(actions: IRuntimeAction[], clock: IRuntimeClock): void {
    for (const action of actions) {
        if (action.type === 'push-block' || action.type === 'push-child-block') {
            // Inject clock into push actions
            const pushAction = action as PushBlockAction;
            pushAction.do(this, { clock });
        } else {
            action.do(this);
        }
    }
}

/**
 * Queue actions with clock context for later execution.
 */
private queueActionsWithClock(actions: IRuntimeAction[], clock: IRuntimeClock): void {
    // Wrap actions to preserve clock context
    const wrappedActions = actions.map(action => ({
        ...action,
        _clock: clock,
        do: (runtime: IScriptRuntime) => {
            if (action.type === 'push-block' || action.type === 'push-child-block') {
                (action as any).do(runtime, { clock });
            } else {
                action.do(runtime);
            }
        }
    }));
    
    this._actionQueue.push(...wrappedActions);
    this.processActions();
}
```

---

### Phase 5: Update PushBlockAction to Accept Clock

**File:** [src/runtime/actions/stack/PushBlockAction.ts](../src/runtime/actions/stack/PushBlockAction.ts)  
**Estimated effort:** 30 minutes

```typescript
import { IRuntimeClock } from '../contracts/IRuntimeClock';

export class PushBlockAction implements IRuntimeAction {
    private _type = 'push-block';

    constructor(
        public readonly block: IRuntimeBlock, 
        private readonly options: BlockLifecycleOptions = {}
    ) { }

    get type(): string {
        return this._type;
    }

    /**
     * Execute the push action.
     * @param runtime The script runtime
     * @param execOptions Execution-time options (may include clock from pop chain)
     */
    do(runtime: IScriptRuntime, execOptions?: { clock?: IRuntimeClock }): void {
        if (!runtime.stack) {
            return;
        }

        try {
            // Clock priority: explicit options > execution context > runtime clock
            const clock = this.options.clock ?? execOptions?.clock ?? runtime.clock;
            
            // StartTime priority: explicit options > clock.now
            let startTime = this.options.startTime ?? clock.now;

            const lifecycle: BlockLifecycleOptions = {
                ...this.options,
                startTime,
                clock  // Propagate clock to mount()
            };

            const target = this.block as IRuntimeBlock & { executionTiming?: BlockLifecycleOptions };
            target.executionTiming = { ...(target.executionTiming ?? {}), startTime };

            // Push the block - mount() will receive the clock
            runtime.pushBlock(this.block, lifecycle);

        } catch (error) {
            const runtimeWithSetError = runtime as IScriptRuntime & { setError?: (error: unknown) => void };
            if (typeof runtimeWithSetError.setError === 'function') {
                runtimeWithSetError.setError(error);
            }
        }
    }
}
```

---

### Phase 6: Update ScriptRuntime.pushBlock() to Pass Clock

**File:** [src/runtime/ScriptRuntime.ts](../src/runtime/ScriptRuntime.ts)  
**Estimated effort:** 15 minutes

```typescript
public pushBlock(block: IRuntimeBlock, options: BlockLifecycleOptions = {}): IRuntimeBlock {
    this.log(`[RT] pushBlock: ${block.label} (${block.key})`);
    this.validateBlock(block);

    const parentBlock = this.stack.current;
    this._hooks.onBeforePush?.(block, parentBlock);

    // ... existing tracking code ...

    // Use provided clock or fall back to runtime clock
    const clock = options.clock ?? this.clock;
    const startTime = options.startTime ?? clock.now;
    
    const lifecycleOptions: BlockLifecycleOptions = {
        ...options,
        startTime,
        clock  // Pass clock to mount()
    };

    this.setStartTime(wrappedBlock, startTime);

    // ... existing wrapping code ...

    this.stack.push(wrappedBlock);
    this.eventBus.dispatch(new StackPushEvent(this.stack.blocks), this);

    // Mount receives the clock
    const actions = wrappedBlock.mount(this, lifecycleOptions);
    this.log(`[RT] pushBlock: mount returned ${actions.length} actions`);
    
    // Queue actions - if we're in a snapshot chain, clock is already set
    this.queueActions(actions);

    // ... rest of existing code ...

    return wrappedBlock;
}
```

---

### Phase 7: Update NextEventHandler to Create Snapshot

**File:** [src/runtime/events/NextEventHandler.ts](../src/runtime/events/NextEventHandler.ts)  
**Estimated effort:** 30 minutes

When a `next` event is fired (e.g., user clicks "Next"), we should freeze time at the event timestamp:

```typescript
import { SnapshotClock } from '../RuntimeClock';

export class NextEventHandler implements IEventHandler {
    // ... existing code ...

    handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[] {
        if (event.name !== 'next') {
            return [];
        }

        if (!runtime || !runtime.stack || runtime.stack.count <= 1) {
            return [ThrowError(new Error('Invalid runtime state for next event'), 'NextEventHandler')];
        }

        // Create snapshot at event timestamp for consistent timing
        const snapshotClock = SnapshotClock.at(runtime.clock, event.timestamp);

        // Return NextAction with the snapshot clock
        return [new NextAction({ clock: snapshotClock })];
    }
}
```

Update NextAction to accept and use clock:

```typescript
export class NextAction implements IRuntimeAction {
    readonly type = 'next';
    
    constructor(private readonly options: { clock?: IRuntimeClock } = {}) {}

    do(runtime: IScriptRuntime): void {
        if (!this.validateRuntimeState(runtime)) {
            return;
        }

        const currentBlock = runtime.stack.current;
        if (!currentBlock) {
            return;
        }

        try {
            // Call next with the snapshot clock
            const nextActions = currentBlock.next(runtime, { clock: this.options.clock });

            if (runtime.queueActions && nextActions.length > 0) {
                runtime.queueActions(nextActions);
            } else {
                for (const action of nextActions) {
                    action.do(runtime);
                }
            }
        } catch (error) {
            // ... error handling ...
        }
    }
}
```

---

### Phase 8: Integration Tests

**Estimated effort:** 1-2 hours

```typescript
describe('Clock Propagation Through Lifecycle', () => {
    it('should pass snapshot clock from pop to parent.next to child push', () => {
        const runtime = createTestRuntime();
        const completedAt = new Date('2024-01-01T12:00:00Z');
        
        // Set up parent → child stack
        runtime.pushBlock(parentBlock);
        runtime.pushBlock(childBlock);
        
        // Pop child with specific completedAt
        runtime.popBlock({ completedAt });
        
        // Parent's onNext pushed a new child via ChildRunnerBehavior
        // Verify new child started at completedAt
        const newChild = runtime.stack.current;
        expect(newChild.executionTiming.startTime).toEqual(completedAt);
        
        // Verify timer memory uses frozen time
        const timerState = newChild.getMemory('timer');
        expect(timerState.spans[0].started).toBe(completedAt.getTime());
    });

    it('should use event timestamp when next event triggers chain', () => {
        const runtime = createTestRuntime();
        const eventTime = new Date('2024-01-01T12:00:00Z');
        
        runtime.pushBlock(parentBlock);
        runtime.pushBlock(childBlock);
        
        // Dispatch next event with specific timestamp
        runtime.handle({ name: 'next', timestamp: eventTime, data: {} });
        
        // Child should have been popped and new child pushed
        // with start time matching event timestamp
        const newChild = runtime.stack.current;
        expect(newChild.executionTiming.startTime).toEqual(eventTime);
    });

    it('should maintain frozen time through multi-push scenarios', () => {
        const runtime = createTestRuntime();
        const triggerTime = new Date('2024-01-01T12:00:00Z');
        
        // Parent that pushes two children on next()
        const multiPushParent = createMultiPushParent();
        runtime.pushBlock(multiPushParent);
        runtime.pushBlock(childBlock);
        
        runtime.popBlock({ completedAt: triggerTime });
        
        // Both pushed children should have same start time
        // (depends on how stack handles multiple pushes)
        expect(childA.executionTiming.startTime).toEqual(triggerTime);
        expect(childB.executionTiming.startTime).toEqual(triggerTime);
    });

    it('should handle zero-duration timer chains', () => {
        const runtime = createTestRuntime();
        const startTime = new Date('2024-01-01T12:00:00Z');
        
        // Zero-duration timer completes immediately on mount
        // Should trigger pop → parent.next → push next child
        // All with same timestamp
        runtime.pushBlock(parentBlock, { startTime });
        runtime.pushBlock(zeroTimerBlock);  // Completes immediately
        
        // Sweep should pop zero timer and push next child
        // All at startTime
        const nextChild = runtime.stack.current;
        expect(nextChild.executionTiming.startTime).toEqual(startTime);
    });
});
```

---

## Summary: Clock Flow Diagram

```
                         ┌─────────────────────────┐
                         │  Timer expires at T₁    │
                         │  (tick detects elapsed  │
                         │   >= duration)          │
                         └───────────┬─────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────────┐
                    │  TimerCompletionBehavior           │
                    │  ctx.markComplete('timer-expired') │
                    └───────────┬────────────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────────────┐
              │  sweepCompletedBlocks() → popBlock()        │
              │                                             │
              │  completedAt = T₁                           │
              │  snapshotClock = SnapshotClock.at(clock, T₁)│
              └───────────┬─────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌───────────┐    ┌────────────┐    ┌────────────────┐
  │ unmount() │    │ dispose()  │    │ parent.next()  │
  │ clock: T₁ │    │            │    │ clock: T₁      │
  └───────────┘    └────────────┘    └───────┬────────┘
                                             │
                                             ▼
                          ┌──────────────────────────────────┐
                          │  ChildRunnerBehavior.onNext()    │
                          │  ctx.clock.now = T₁              │
                          │  returns [PushChildBlockAction]  │
                          └───────────┬──────────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────────────────┐
                          │  PushBlockAction.do()            │
                          │  clock: snapshotClock (T₁)       │
                          │  startTime = clock.now = T₁      │
                          └───────────┬──────────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────────────────┐
                          │  pushBlock() → mount()           │
                          │  clock: snapshotClock (T₁)       │
                          └───────────┬──────────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────────────────┐
                          │  TimerInitBehavior.onMount()     │
                          │  ctx.clock.now = T₁              │
                          │  spans: [TimeSpan(T₁)]           │
                          │                                  │
                          │  ✓ New timer starts at exact     │
                          │    moment old timer ended        │
                          └──────────────────────────────────┘
```

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/runtime/RuntimeClock.ts` | **Add** | `SnapshotClock` class |
| `src/runtime/contracts/IRuntimeBlock.ts` | **Modify** | Add `clock?: IRuntimeClock` to `BlockLifecycleOptions` |
| `src/runtime/RuntimeBlock.ts` | **Modify** | Use `options.clock` in `mount()`, `next()`, `unmount()` |
| `src/runtime/ScriptRuntime.ts` | **Modify** | Create snapshot in `popBlock()`, pass to lifecycle methods |
| `src/runtime/actions/stack/PushBlockAction.ts` | **Modify** | Accept and use clock from options/execution context |
| `src/runtime/events/NextEventHandler.ts` | **Modify** | Create snapshot at event timestamp |
| `src/runtime/actions/stack/NextAction.ts` | **Modify** | Accept and pass clock option |
| `tests/lifecycle/SnapshotClock.test.ts` | **Add** | Unit tests for SnapshotClock |
| `tests/lifecycle/ClockPropagation.test.ts` | **Add** | Integration tests for clock flow |

**Total estimated effort: 4-6 hours**

---

## Test Cases

### Unit Tests

```typescript
describe('SnapshotClock', () => {
    it('should return frozen time from now property', () => {
        const realClock = new RuntimeClock();
        const frozenTime = new Date('2024-01-01T12:00:00Z');
        const snapshot = new SnapshotClock(realClock, frozenTime);
        
        expect(snapshot.now).toEqual(frozenTime);
        
        // Even after real time passes, snapshot stays frozen
        await delay(10);
        expect(snapshot.now).toEqual(frozenTime);
    });

    it('should delegate elapsed/isRunning/spans to underlying clock', () => {
        const realClock = new RuntimeClock();
        realClock.start();
        const snapshot = new SnapshotClock(realClock, new Date());
        
        expect(snapshot.isRunning).toBe(true);
        expect(snapshot.spans.length).toBe(1);
    });
});

describe('Timestamp Propagation with Snapshot Clock', () => {
    it('should freeze time during pop → parent.next → push chain', () => {
        const runtime = createTestRuntime();
        const completedAt = new Date('2024-01-01T12:00:00Z');
        
        // Push parent and child
        runtime.pushBlock(parentBlock);
        runtime.pushBlock(childBlock);
        
        // Pop child with specific completedAt
        runtime.popBlock({ completedAt });
        
        // Parent's onNext pushed a new child
        // Verify new child started at completedAt, not later
        const newChild = runtime.stack.current;
        expect(newChild.executionTiming.startTime).toEqual(completedAt);
    });

    it('should handle multiple pushes in single next()', () => {
        // Block.onNext returns [PushA, PushB]
        // Both should get same frozen timestamp
        const triggerTime = new Date('2024-01-01T12:00:00Z');
        runtime.popBlock({ completedAt: triggerTime });
        
        // Both children should have same start time
        expect(childA.executionTiming.startTime).toEqual(triggerTime);
        expect(childB.executionTiming.startTime).toEqual(triggerTime);
    });

    it('should restore real clock after chain completes', () => {
        const beforePop = runtime.clock.now;
        runtime.popBlock({ completedAt: new Date('2024-01-01T12:00:00Z') });
        const afterPop = runtime.clock.now;
        
        // After pop completes, clock should return real time again
        expect(afterPop.getTime()).toBeGreaterThanOrEqual(beforePop.getTime());
    });

    it('should handle zero-duration timer chains correctly', () => {
        // Push parent with zero-duration timer child
        // Child completes immediately on mount
        // Next child should start at same frozen time
        const triggerTime = new Date('2024-01-01T12:00:00Z');
        runtime.pushBlock(zeroTimerParent, { startTime: triggerTime });
        
        // All children in chain should have same start time
        expect(child1.executionTiming.startTime).toEqual(triggerTime);
        expect(child2.executionTiming.startTime).toEqual(triggerTime);
    });
});
```

### Integration Tests

```typescript
describe('Timer Chaining Accuracy', () => {
    it('should have no timing gap between sequential timers', () => {
        const script = parse('3:00 Run\n1:00 Rest');
        const runtime = createRuntime(script);
        
        // Complete first timer at exactly T=180000ms
        advanceClockTo(180000);
        
        // Verify second timer started at T=180000ms, not T=180005ms
        const restBlock = runtime.stack.current;
        expect(restBlock.executionTiming.startTime.getTime()).toBe(180000);
        
        // Verify timer memory also uses frozen time
        const timerState = restBlock.getMemory('timer');
        expect(timerState.spans[0].started).toBe(180000);
    });

    it('should maintain timing across round transitions', () => {
        const script = parse('3 Rounds\n  1:00 Work');
        const runtime = createRuntime(script);
        
        // Complete round 1 at T=60000
        advanceClockTo(60000);
        const round2 = runtime.stack.current;
        expect(round2.executionTiming.startTime.getTime()).toBe(60000);
        
        // Complete round 2 at T=120000
        advanceClockTo(120000);
        const round3 = runtime.stack.current;
        expect(round3.executionTiming.startTime.getTime()).toBe(120000);
    });
});
```

---

## Appendix: Current Code References

### Key Files

| File | Relevance |
|------|-----------|
| [RuntimeClock.ts](../src/runtime/RuntimeClock.ts) | IRuntimeClock implementation, SnapshotClock to be added here |
| [IRuntimeClock.ts](../src/runtime/contracts/IRuntimeClock.ts) | Clock interface (no changes needed) |
| [ScriptRuntime.ts](../src/runtime/ScriptRuntime.ts#L366-L430) | `popBlock()` implementation, freeze point |
| [RuntimeBlock.ts](../src/runtime/RuntimeBlock.ts#L178-L200) | `next()` lifecycle method |
| [BehaviorContext.ts](../src/runtime/BehaviorContext.ts) | Uses `ctx.clock.now` (benefits automatically) |
| [ChildRunnerBehavior.ts](../src/runtime/behaviors/ChildRunnerBehavior.ts) | Child push logic (no changes needed) |
| [PushBlockAction.ts](../src/runtime/actions/stack/PushBlockAction.ts) | Uses `runtime.clock.now` (benefits automatically) |
| [TimerInitBehavior.ts](../src/runtime/behaviors/TimerInitBehavior.ts) | Uses `ctx.clock.now.getTime()` (benefits automatically) |

### Existing Clock Usage

The clock is already used consistently throughout the system:

```typescript
// Behaviors use ctx.clock.now
const now = ctx.clock.now.getTime();
ctx.setMemory('timer', { spans: [new TimeSpan(now)], ... });

// Actions use runtime.clock.now
let startTime = this.options.startTime ?? runtime.clock.now;

// Harness uses clock for testing
harness.advanceClock(5000);
expect(harness.clock.now.getTime()).toBe(start + 5000);
```

With Approach 5, all of this code automatically benefits from frozen time during execution chains.
