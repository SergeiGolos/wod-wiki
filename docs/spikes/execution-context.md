# Spike: Execution Context for Consistent Event Chain Timing

**Status**: Draft  
**Created**: 2025-02-01  
**Updated**: 2025-02-01  
**Author**: AI Assistant  
**Priority**: Medium  

## Problem Statement

When an event fires on the runtime (e.g., timer complete, user action), it triggers a chain of actions that may cascade through multiple operations:

```
Event fires at T₁
  └─ popBlock() → returns actions
      └─ parent.next() → returns PushBlockAction
          └─ pushBlock() → child mounts at T₁
              └─ mount() → returns more actions
                  └─ ... chain continues
```

**The entire chain should execute against the same timestamp T₁**, but currently:

1. **Parameter threading** - Frozen clock must be passed via `BlockLifecycleOptions.clock` through every layer
2. **Action queue timing gap** - Actions queued during processing may execute with a different `clock.now`
3. **Inconsistent patterns** - Code reads from `options?.clock`, `context.clock`, or `runtime.clock`
4. **Fragile by default** - New code paths can forget to pass the clock

### Current Flow Problem

```typescript
// Event fires at T₁
handle(event) {
  const actions = eventBus.dispatch(event);  // T₁
  queueActions(actions);
}

// But processActions runs in a loop...
processActions() {
  while (queue.length > 0) {
    action.do(this);  // action.do() sees runtime.clock.now = T₂ (later!)
    // action may queue more actions that see T₃, T₄...
  }
}
```

Each action in the chain sees a different `clock.now`, breaking timing consistency.

### Current Mitigation (Insufficient)

```
popBlock(options)
  └─ creates SnapshotClock.at(clock, completedAt)
  └─ passes via lifecycleOptions: { clock: snapshotClock }
      └─ unmount(runtime, lifecycleOptions)
      └─ parent.next(runtime, lifecycleOptions)
          └─ PushBlockAction(block, { clock: options.clock })  // Must remember!
              └─ pushBlock(block, lifecycle)
                  └─ mount(runtime, options)
```

This requires every layer to explicitly pass the clock forward.

## Proposed Solution: Execution Context

Create an **Execution Context** that:
1. Captures the frozen timestamp when an event fires
2. Wraps the runtime to provide consistent `clock.now` to all operations
3. Manages the action queue for the entire execution chain
4. Only releases the frozen time after ALL chained actions complete

### Core Concept

```typescript
/**
 * ExecutionContext wraps a runtime during event processing.
 * All actions executed within a context see the same frozen timestamp.
 */
interface IExecutionContext {
  /** The underlying runtime */
  readonly runtime: IScriptRuntime;
  
  /** Frozen timestamp for this execution chain */
  readonly timestamp: Date;
  
  /** What triggered this execution context */
  readonly trigger: ExecutionTrigger;
  
  /** Queue an action to execute within this context */
  queueAction(action: IRuntimeAction): void;
  
  /** Process all queued actions (called internally) */
  processActions(): void;
}

type ExecutionTrigger = 
  | { type: 'event'; event: IEvent }
  | { type: 'timer-complete'; blockKey: string }
  | { type: 'user-action'; action: string };
```

### Key Insight: Context-Scoped Action Queue

The execution context owns its own action queue. When an action is executed:
- It receives the context (not raw runtime)
- Any actions it returns are queued on the SAME context
- The frozen timestamp persists until the context's queue is empty

```typescript
class ExecutionContext implements IExecutionContext {
  private _actionQueue: IRuntimeAction[] = [];
  private readonly _frozenClock: IRuntimeClock;
  
  constructor(
    readonly runtime: IScriptRuntime,
    readonly timestamp: Date,
    readonly trigger: ExecutionTrigger
  ) {
    this._frozenClock = SnapshotClock.at(runtime.clock, timestamp);
  }
  
  /** Frozen clock - all operations see this */
  get clock(): IRuntimeClock {
    return this._frozenClock;
  }
  
  queueAction(action: IRuntimeAction): void {
    this._actionQueue.push(action);
  }
  
  queueActions(actions: IRuntimeAction[]): void {
    this._actionQueue.push(...actions);
  }
  
  processActions(): void {
    while (this._actionQueue.length > 0) {
      const action = this._actionQueue.shift()!;
      // Action executes with context, sees frozen clock
      action.do(this);
    }
  }
}
```

### Runtime Integration

The runtime creates an execution context when handling events:

```typescript
class ScriptRuntime {
  private _activeContext?: ExecutionContext;
  
  /** Current clock - returns context's frozen clock if in execution chain */
  get clock(): IRuntimeClock {
    return this._activeContext?.clock ?? this._baseClock;
  }
  
  handle(event: IEvent): void {
    // Capture timestamp at event fire
    const timestamp = this._baseClock.now;
    
    // Create execution context for this event chain
    const context = new ExecutionContext(this, timestamp, { type: 'event', event });
    
    this._activeContext = context;
    try {
      // Dispatch event - actions go to context queue
      const actions = this.eventBus.dispatch(event, this);
      context.queueActions(actions);
      
      // Process all actions in chain with frozen time
      context.processActions();
    } finally {
      this._activeContext = undefined;
    }
  }
}
```

### Flow Example: Timer Complete

```
Timer fires at T₁ (12:00:00.000)
  │
  ├─ ExecutionContext created with timestamp = T₁
  │
  ├─ TimerBehavior.onComplete() → returns [PopBlockAction]
  │   └─ queued to context
  │
  └─ context.processActions() begins
      │
      ├─ PopBlockAction.do(context)
      │   ├─ context.clock.now = T₁ (frozen!)
      │   ├─ block.unmount() 
      │   ├─ parent.next() → returns [PushBlockAction(childBlock)]
      │   │   └─ queued to SAME context
      │   └─ returns
      │
      ├─ PushBlockAction.do(context)
      │   ├─ context.clock.now = T₁ (still frozen!)
      │   ├─ childBlock.startTime = T₁
      │   ├─ childBlock.mount() → returns [StartTimerAction]
      │   │   └─ queued to SAME context
      │   └─ returns
      │
      ├─ StartTimerAction.do(context)
      │   ├─ context.clock.now = T₁ (still frozen!)
      │   └─ timer starts at T₁
      │
      └─ queue empty → context ends
          └─ T₁ released, clock returns to real time
```

**Result**: Child block's start time exactly matches parent's completion time.

### Action Interface Update

Actions receive the execution context instead of raw runtime:

```typescript
// BEFORE
interface IRuntimeAction {
  do(runtime: IScriptRuntime): void;
}

// AFTER
interface IRuntimeAction {
  do(context: IExecutionContext): void;
}

// Actions access runtime through context
class PushBlockAction implements IRuntimeAction {
  do(context: IExecutionContext): void {
    const startTime = context.clock.now;  // Frozen!
    context.runtime.pushBlock(this.block, { startTime });
  }
}
```

### Backward Compatibility Option

To ease migration, context can implement IScriptRuntime interface:

```typescript
class ExecutionContext implements IExecutionContext, IScriptRuntime {
  // Delegate runtime methods
  get stack() { return this.runtime.stack; }
  get memory() { return this.runtime.memory; }
  get eventBus() { return this.runtime.eventBus; }
  
  // Override clock to return frozen
  get clock() { return this._frozenClock; }
  
  // Queue actions to context queue
  queueActions(actions: IRuntimeAction[]) {
    this._actionQueue.push(...actions);
  }
  
  // Delegate lifecycle to runtime but with frozen timing
  pushBlock(block: IRuntimeBlock): IRuntimeBlock {
    return this.runtime.pushBlock(block, { startTime: this.clock.now });
  }
}
```

This allows existing action code to work unchanged - they just see a "runtime" that has frozen time.

## Benefits

| Aspect | Current | Proposed |
|--------|---------|----------|
| Parameter threading | Required everywhere | Eliminated |
| Action chain timing | Each action sees different time | All actions see same frozen time |
| Default behavior | Easy to forget clock | Correct by default |
| Debugging | Implicit frozen semantics | Explicit context with trigger info |
| Action queue | Global, timing-unaware | Per-context, timing-consistent |

## Migration Path

### Phase 1: Add ExecutionContext Infrastructure (Non-breaking)
1. Create `ExecutionContext` class
2. Create `IExecutionContext` interface
3. Add `_activeContext` to `ScriptRuntime`
4. Modify `clock` getter to prefer context clock
5. Keep existing action signatures working

### Phase 2: Migrate Event Handling
1. Wrap `handle(event)` with context creation
2. Wrap `queueActions` entry points with context
3. Actions still receive runtime (via context delegation)

### Phase 3: Migrate Actions
1. Update `IRuntimeAction.do()` to accept `IExecutionContext`
2. Migrate actions one-by-one to use `context.clock`
3. Remove `options.clock` from action constructors

### Phase 4: Cleanup
1. Remove `clock` from `BlockLifecycleOptions`
2. Simplify `RuntimeBlock.mount/next/unmount` signatures
3. Simplify `BehaviorContext` (no clock parameter)
4. Update documentation

## Technical Constraints

### Context Nesting

Contexts can nest (e.g., event during action processing). The innermost context wins:

```typescript
class ScriptRuntime {
  private _contextStack: ExecutionContext[] = [];
  
  get clock(): IRuntimeClock {
    const active = this._contextStack[this._contextStack.length - 1];
    return active?.clock ?? this._baseClock;
  }
  
  executeInContext<T>(trigger: ExecutionTrigger, fn: () => T): T {
    const timestamp = this._baseClock.now;
    const context = new ExecutionContext(this, timestamp, trigger);
    this._contextStack.push(context);
    try {
      return fn();
    } finally {
      this._contextStack.pop();
    }
  }
}
```

### Action Queue Ownership

**Key Design Decision**: Each context owns its action queue.

- Actions queued during context execution go to that context's queue
- Context processes its queue before returning
- Outer contexts don't see inner context's actions

```typescript
// Nested context example
outerContext.processActions();
  // Action A runs, triggers an event
  innerContext = new ExecutionContext(timestamp2);
  innerContext.processActions();
    // Actions B, C run with timestamp2
  // Inner context completes
  // Action D continues with timestamp1 (outer)
```

### Thread Safety
Not applicable - JavaScript is single-threaded. Context stack is safe.

### Async Operations
**Concern**: If action processing contains async code, context could leak.

**Mitigation**: 
- Document that execution contexts are for synchronous chains only
- Current action queue is synchronous
- For async scenarios, create new context when resuming

### Error Handling
Context cleanup happens in `finally` block:

```typescript
executeInContext<T>(trigger: ExecutionTrigger, fn: () => T): T {
  const context = new ExecutionContext(...);
  this._contextStack.push(context);
  try {
    const result = fn();
    context.processActions();  // Drain queue
    return result;
  } finally {
    this._contextStack.pop();  // Always cleanup
  }
}
```

## Files Affected

### New Files
- `src/runtime/ExecutionContext.ts` - ExecutionContext class
- `src/runtime/contracts/IExecutionContext.ts` - Interface definition

### Core Changes
- `src/runtime/ScriptRuntime.ts` - Add context stack, modify `clock` getter, wrap `handle()`
- `src/runtime/contracts/IScriptRuntime.ts` - Export context types

### Action Updates (Phase 3)
- `src/runtime/contracts/IRuntimeAction.ts` - Update `do()` signature
- `src/runtime/actions/stack/NextAction.ts` - Use `context.clock`
- `src/runtime/actions/stack/PushBlockAction.ts` - Use `context.clock`, remove `options.clock`
- `src/runtime/actions/stack/PopBlockAction.ts` - Use `context.clock`
- All other actions in `src/runtime/actions/`

### Cleanup (Phase 4)
- `src/runtime/contracts/IRuntimeBlock.ts` - Remove `clock` from `BlockLifecycleOptions`
- `src/runtime/RuntimeBlock.ts` - Simplify mount/next/unmount
- `src/runtime/BehaviorContext.ts` - Remove clock parameter from constructor

## Testing Strategy

### Unit Tests: ExecutionContext
1. Context captures frozen timestamp correctly
2. `context.clock.now` always returns frozen time
3. Actions queued during processing see same timestamp
4. Nested contexts maintain separate timestamps
5. Context cleanup happens on exception

### Unit Tests: ScriptRuntime Integration
1. `runtime.clock` returns context clock when active
2. `runtime.clock` returns base clock when no context
3. Context stack pushes/pops correctly
4. `handle(event)` creates and destroys context

### Integration Tests: Execution Chains
1. pop → next → push chain sees consistent timestamp
2. Multiple blocks pushed in chain all have same start time
3. Timer complete → child push has no timing gap
4. User action (next) → push has consistent timing
5. sweepCompletedBlocks within context maintains timestamp

### Regression Tests
1. Existing timer tests pass
2. Existing behavior tests pass  
3. Storybook component tests pass
4. Performance benchmarks show no degradation

### Edge Case Tests
1. Event during action processing (nested context)
2. Exception during action processing
3. Empty action queue
4. Rapid successive events

## Success Criteria

- [ ] `ExecutionContext` class implemented with frozen clock
- [ ] Context owns and processes its own action queue
- [ ] `runtime.clock` returns context clock when inside execution chain
- [ ] All actions in a chain see identical `clock.now` value
- [ ] pop → next → push has zero timing gap
- [ ] `options.clock` parameter eliminated from `BlockLifecycleOptions`
- [ ] Existing tests pass without modification
- [ ] New code paths automatically get correct frozen time

## Alternatives Considered

### Alternative 1: Scoped Clock Binding (withFrozenTime)

```typescript
runtime.withFrozenTime(timestamp, () => {
  // operations here see frozen time
});
```

**Problem**: Doesn't address action queue timing. Actions queued during the callback would still be processed later with unfrozen time.

### Alternative 2: Parameter Threading (Current)
Continue passing `options.clock` through every layer.

**Rejected**: Fragile, verbose, easy to forget, doesn't handle action queue.

### Alternative 3: Mutable Clock State
Add `freeze()/unfreeze()` to clock itself.

**Rejected**: Mutable global state, hard to reason about, doesn't handle action queue.

## External Resources

- [Redux Middleware](https://redux.js.org/understanding/history-and-design/middleware) - Similar action queue with dispatch context
- [Zone.js](https://github.com/angular/angular/tree/main/packages/zone.js) - Execution context propagation
- [Temporal Proposal](https://tc39.es/proposal-temporal/docs/) - Modern JS time handling patterns
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) - Events with consistent timestamps

## Detailed Design

### IExecutionContext Interface

```typescript
// src/runtime/contracts/IExecutionContext.ts

import { IRuntimeClock } from './IRuntimeClock';
import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';

export type ExecutionTrigger = 
  | { type: 'event'; eventName: string }
  | { type: 'timer-complete'; blockKey: string }
  | { type: 'user-action'; action: string }
  | { type: 'sweep'; }
  | { type: 'manual'; reason?: string };

export interface IExecutionContext {
  /** The underlying runtime (for stack, memory, eventBus access) */
  readonly runtime: IScriptRuntime;
  
  /** Frozen timestamp - all operations in this context see this time */
  readonly timestamp: Date;
  
  /** Frozen clock wrapper */
  readonly clock: IRuntimeClock;
  
  /** What initiated this execution context */
  readonly trigger: ExecutionTrigger;
  
  /** Unique ID for debugging/tracing */
  readonly id: string;
  
  /** Queue actions for execution within this context */
  queueActions(actions: IRuntimeAction[]): void;
  
  /** Check if context has pending actions */
  readonly hasPendingActions: boolean;
}
```

### ExecutionContext Implementation

```typescript
// src/runtime/ExecutionContext.ts

import { IExecutionContext, ExecutionTrigger } from './contracts/IExecutionContext';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { SnapshotClock } from './RuntimeClock';

let contextIdCounter = 0;

export class ExecutionContext implements IExecutionContext {
  readonly id: string;
  readonly clock: IRuntimeClock;
  
  private _actionQueue: IRuntimeAction[] = [];
  private _isProcessing = false;
  
  constructor(
    readonly runtime: IScriptRuntime,
    readonly timestamp: Date,
    readonly trigger: ExecutionTrigger
  ) {
    this.id = `ctx-${++contextIdCounter}`;
    this.clock = SnapshotClock.at(runtime.clock, timestamp);
  }
  
  get hasPendingActions(): boolean {
    return this._actionQueue.length > 0;
  }
  
  queueActions(actions: IRuntimeAction[]): void {
    this._actionQueue.push(...actions);
  }
  
  /**
   * Process all queued actions.
   * Actions may queue more actions - we drain until empty.
   */
  processActions(): void {
    if (this._isProcessing) {
      // Re-entrant call - actions will be processed by outer loop
      return;
    }
    
    this._isProcessing = true;
    const MAX_ITERATIONS = 100;
    let iterations = 0;
    
    try {
      while (this._actionQueue.length > 0 && iterations < MAX_ITERATIONS) {
        const action = this._actionQueue.shift()!;
        // Pass this context to action - it sees frozen clock
        action.do(this);
        iterations++;
      }
      
      if (iterations >= MAX_ITERATIONS) {
        console.error(`[ExecutionContext ${this.id}] Max iterations exceeded`);
      }
    } finally {
      this._isProcessing = false;
    }
  }
}
```

### ScriptRuntime Integration

```typescript
// Additions to ScriptRuntime.ts

class ScriptRuntime implements IScriptRuntime {
  private _baseClock: IRuntimeClock;
  private _contextStack: ExecutionContext[] = [];
  
  /** Returns frozen clock if in execution context, otherwise base clock */
  get clock(): IRuntimeClock {
    const active = this._contextStack[this._contextStack.length - 1];
    return active?.clock ?? this._baseClock;
  }
  
  /** Current execution context (if any) */
  get activeContext(): IExecutionContext | undefined {
    return this._contextStack[this._contextStack.length - 1];
  }
  
  /**
   * Execute within an execution context.
   * All operations see frozen timestamp until context completes.
   */
  withExecutionContext<T>(
    trigger: ExecutionTrigger,
    fn: (context: ExecutionContext) => T
  ): T {
    const timestamp = this._baseClock.now;
    const context = new ExecutionContext(this, timestamp, trigger);
    
    this._contextStack.push(context);
    try {
      const result = fn(context);
      context.processActions();
      return result;
    } finally {
      this._contextStack.pop();
    }
  }
  
  /**
   * Handle an event within an execution context.
   */
  handle(event: IEvent): void {
    this.withExecutionContext({ type: 'event', eventName: event.name }, (context) => {
      const actions = this.eventBus.dispatch(event, this);
      context.queueActions(actions);
    });
  }
  
  /**
   * Queue actions - routes to active context or creates new one.
   */
  queueActions(actions: IRuntimeAction[]): void {
    if (this._contextStack.length > 0) {
      // Inside a context - queue to that context
      this._contextStack[this._contextStack.length - 1].queueActions(actions);
    } else {
      // No context - create one for this action batch
      this.withExecutionContext({ type: 'manual' }, (context) => {
        context.queueActions(actions);
      });
    }
  }
}
```

## Investigation Results

*To be populated during spike validation*

## Prototype/Testing Notes

*To be populated during implementation*

## Decision/Recommendation

**Recommended**: Proceed with Execution Context approach.

The key insight is that **frozen time must persist through the entire action queue processing**, not just synchronous call chains. The Execution Context pattern:

1. **Owns the action queue** - Actions queued during processing stay in the same context
2. **Provides frozen clock** - All actions see `context.clock.now` = trigger timestamp
3. **Is explicit** - Context creation marks the boundary where time freezes
4. **Is composable** - Nested contexts (event during action) work correctly
5. **Is backward compatible** - Context implements/delegates IScriptRuntime interface

### Why This Beats withFrozenTime

The original `withFrozenTime` proposal only froze time for synchronous code inside the callback. But actions return arrays that get queued and processed later:

```typescript
// withFrozenTime problem:
withFrozenTime(t1, () => {
  const actions = block.next();  // sees T₁
  queueActions(actions);         // queued...
});
// ... later ...
processActions();  // actions see T₂ (not frozen anymore!)
```

Execution Context solves this by owning the queue:

```typescript
// Execution Context solution:
withExecutionContext(trigger, (ctx) => {
  const actions = block.next();  // sees T₁
  ctx.queueActions(actions);     // queued to ctx
  // ctx.processActions() called automatically
  // all actions see T₁!
});
```

## Status History

| Date | Status | Notes |
|------|--------|-------|
| 2025-02-01 | Draft | Initial spike document (Scoped Clock Binding) |
| 2025-02-01 | Revised | Refactored to Execution Context approach |
