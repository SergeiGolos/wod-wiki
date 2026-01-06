# Stack Completion Redesign Proposal

## Executive Summary

This document proposes a fundamental redesign of how block completion is managed in the WOD Wiki runtime stack. The current design requires behaviors to explicitly return `PopBlockAction` when they complete, which creates a coupling between completion detection and pop execution. The proposed design separates these concerns: behaviors simply set a completion flag, and the stack autonomously checks for and pops completed blocks after action/event processing.

---

## Current Design Analysis

### How Block Completion Currently Works

1. **Behaviors return `PopBlockAction`**: When a behavior determines its block should complete, it returns a `PopBlockAction` from `onNext()` or `onEvent()`:

   ```typescript
   // CompletionBehavior.ts
   onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
     const now = clock.now;
     if (this.condition(block, now)) {
       return [
         new EmitEventAction('block:complete', { blockId: block.key.toString() }),
         new PopBlockAction()  // ← Explicitly triggers pop
       ];
     }
     return [];
   }
   ```

2. **`PopBlockAction` is executed through action queue**: The action is queued and executed, calling `runtime.popBlock()`.

3. **`popBlock()` triggers parent's `next()`**: After cleanup, the parent block's `next()` is called, which may return more `PopBlockAction`s.

### Behaviors That Currently Return `PopBlockAction`

| Behavior | Trigger | Pattern |
|----------|---------|---------|
| `CompletionBehavior` | Condition function returns true | Generic conditional completion |
| `BoundLoopBehavior` | Round count exceeds limit | Loop iteration tracking |
| `SinglePassBehavior` | Round count reaches 2 | Single-pass loop detection |
| `PopOnNextBehavior` | Any `next()` call | Immediate dismissal |
| `PopOnEventBehavior` | Specific events received | Event-triggered dismissal |
| `WorkoutFlowStateMachine` | State transitions | Workflow state completion |
| `WorkoutOrchestrator` | Workout completion | Top-level orchestration |

### The Problem

The current design has several issues:

1. **Coupling of completion detection and execution**: Behaviors must know about and return `PopBlockAction`, mixing concerns.

2. **No stack-level visibility**: The stack cannot see which blocks are complete - it only reacts to explicit pop actions.

3. **Completion cascades are complex**: When a child completes, the parent's `next()` is called, which may complete the parent, requiring another `PopBlockAction`.

4. **No autonomous cleanup**: The stack cannot clean up completed blocks on its own after events - it relies entirely on behaviors returning actions.

5. **History events timing**: Completion events are emitted by behaviors before the pop, rather than by the stack during pop, making history tracking less reliable.

---

## Proposed Design

### Core Principle

**Separation of Concerns**: Behaviors signal completion by setting a flag. The stack autonomously checks for completed blocks and pops them.

### Interface Changes

#### 1. Extend `IRuntimeBlock` with Completion State

```typescript
// IRuntimeBlock.ts
export interface IRuntimeBlock {
  // ... existing properties ...

  /**
   * Indicates whether this block has completed execution.
   * When true, the stack will pop this block during its next completion sweep.
   * 
   * @remarks
   * - Set by behaviors when their completion condition is met
   * - Read by the stack after action/event processing
   * - Once true, should not be reset to false
   */
  readonly isComplete: boolean;

  /**
   * Marks the block as complete.
   * Called by behaviors when their completion condition is met.
   * 
   * @param reason Optional reason for completion (for debugging/history)
   */
  markComplete(reason?: string): void;
}
```

#### 2. Extend `IRuntimeStack` with Completion Sweep

```typescript
// IRuntimeStack.ts
export interface IRuntimeStack {
  // ... existing methods ...

  /**
   * Checks for and pops all completed blocks from the stack.
   * Traverses from top to bottom, popping completed blocks and calling
   * parent.next() for each pop until a non-complete block is found.
   * 
   * @returns Array of blocks that were popped
   */
  sweepCompleted(): IRuntimeBlock[];
}
```

#### 3. Add Completion Sweep to `IScriptRuntime`

```typescript
// IScriptRuntime.ts
export interface IScriptRuntime {
  // ... existing methods ...

  /**
   * Performs a completion sweep on the stack.
   * Should be called after processing actions and events.
   */
  sweepCompletedBlocks(): void;
}
```

### Implementation Details

#### RuntimeBlock Changes

```typescript
// RuntimeBlock.ts
export class RuntimeBlock implements IRuntimeBlock {
  private _isComplete = false;
  private _completionReason?: string;

  get isComplete(): boolean {
    return this._isComplete;
  }

  markComplete(reason?: string): void {
    if (this._isComplete) return; // Idempotent
    
    this._isComplete = true;
    this._completionReason = reason;
    
    // Optional: emit completion event for tracking
    // This could be handled by the stack during sweep instead
  }

  // ... rest of existing implementation
}
```

#### ScriptRuntime Changes

```typescript
// ScriptRuntime.ts
export class ScriptRuntime implements IScriptRuntime {
  // ... existing implementation ...

  private processActions() {
    if (this._isProcessingActions) {
      return;
    }

    this._isProcessingActions = true;
    try {
      while (this._actionQueue.length > 0) {
        const action = this._actionQueue.shift();
        if (action) {
          action.do(this);
        }
      }
      
      // NEW: After all actions are processed, sweep for completed blocks
      this.sweepCompletedBlocks();
      
    } finally {
      this._isProcessingActions = false;
    }
  }

  handle(event: IEvent): void {
    const actions = this.eventBus.dispatch(event, this);
    if (actions && actions.length > 0) {
      this.queueActions(actions);
    }
    
    // NEW: After event processing (if no actions), sweep for completed blocks
    if (!actions || actions.length === 0) {
      this.sweepCompletedBlocks();
    }
  }

  sweepCompletedBlocks(): void {
    // Traverse from top of stack, popping completed blocks
    while (this.stack.current?.isComplete) {
      const completedBlock = this.stack.current;
      
      // Pop the completed block (this already calls parent.next())
      this.popBlock();
      
      // Note: popBlock() already calls parent.next() which may
      // mark the parent as complete, so we loop until we find
      // a non-complete block or stack is empty
    }
  }
}
```

### Algorithm: Completion Sweep After Action Execution

```
ALGORITHM: ProcessActionsWithCompletionSweep

1. WHILE actionQueue is not empty:
   a. Dequeue next action
   b. Execute action (action.do(runtime))
   c. Action may:
      - Call block.markComplete() to signal completion
      - Queue more actions
      - Push/pop blocks
   
2. AFTER all actions processed:
   a. CALL sweepCompletedBlocks()
   
3. FUNCTION sweepCompletedBlocks():
   a. WHILE current block exists AND isComplete:
      i.   Pop the current block (handles lifecycle)
      ii.  popBlock() calls parent.next() which may:
           - Mark parent as complete
           - Queue more actions
      iii. IF actions were queued:
           - GOTO step 1 (process new actions)
      iv.  ELSE continue loop to check if parent is now complete
   b. END WHILE

4. END ALGORITHM
```

### Behavior Migration

Behaviors would be updated to call `markComplete()` instead of returning `PopBlockAction`:

```typescript
// Before (CompletionBehavior.ts)
onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
  if (this.condition(block, clock.now)) {
    return [
      new EmitEventAction('block:complete', { blockId: block.key.toString() }),
      new PopBlockAction()
    ];
  }
  return [];
}

// After (CompletionBehavior.ts)
onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
  if (this.condition(block, clock.now)) {
    block.markComplete('condition-met');
    return [
      new EmitEventAction('block:complete', { blockId: block.key.toString() })
    ];
  }
  return [];
}
```

---

## Shortcomings and Infrastructure Challenges

### 1. Recursive Action Processing

**Challenge**: When `sweepCompletedBlocks()` pops a block and calls `parent.next()`, the parent may queue new actions. These actions need to be processed, and then another sweep may be needed.

**Current Infrastructure Gap**: The current `processActions()` doesn't account for this recursion pattern.

**Proposed Solution**: 
- Track whether we're in a "sweep" phase
- After sweep, check if new actions were queued
- If so, process them and sweep again
- Guard against infinite loops with a max iteration count

```typescript
private processActionsAndSweep(): void {
  const MAX_ITERATIONS = 100; // Safety limit
  let iterations = 0;
  
  do {
    // Process all queued actions
    while (this._actionQueue.length > 0 && iterations < MAX_ITERATIONS) {
      const action = this._actionQueue.shift()!;
      action.do(this);
      iterations++;
    }
    
    // Sweep completed blocks (may queue more actions via parent.next())
    this.sweepCompletedBlocks();
    
  } while (this._actionQueue.length > 0 && iterations < MAX_ITERATIONS);
  
  if (iterations >= MAX_ITERATIONS) {
    console.error('[Runtime] Max action iterations exceeded');
  }
}
```

### 2. Backward Compatibility with PopBlockAction

**Challenge**: Existing behaviors return `PopBlockAction`. Changing all of them at once is risky.

**Proposed Solution**: Support both patterns during migration:
- `PopBlockAction` continues to work as-is
- Behaviors can gradually migrate to `markComplete()`
- Eventually deprecate explicit `PopBlockAction` from behaviors

### 3. Timing of History Events

**Challenge**: Currently, `EmitEventAction('block:complete')` is emitted by behaviors. In the new design, should completion events be emitted by the stack during sweep?

**Proposed Solution**: 
- Stack emits `stack:block-completing` before pop
- Stack emits `stack:block-completed` after pop
- Behaviors can still emit custom completion events if needed

```typescript
sweepCompletedBlocks(): void {
  while (this.stack.current?.isComplete) {
    const block = this.stack.current;
    
    // Emit stack-level completion event
    this.eventBus.dispatch(new BlockCompletingEvent(block), this);
    
    // Pop the block
    this.popBlock();
    
    // Emit post-completion event
    this.eventBus.dispatch(new BlockCompletedEvent(block.key), this);
  }
}
```

### 4. Testing Infrastructure Impact

**Challenge**: The test harness (`BehaviorTestHarness`, `MockBlock`) needs updates to support the new `isComplete` pattern.

**Impact Areas**:
- `MockBlock` needs `isComplete` property and `markComplete()` method
- `BehaviorTestHarness` needs to simulate completion sweeps
- Existing tests that assert on `PopBlockAction` in return values need updates

### 5. Multiple Behaviors Competing for Completion

**Challenge**: If multiple behaviors on the same block can trigger completion, they need to coordinate. Currently, the first `PopBlockAction` wins.

**Proposed Solution**: `markComplete()` is idempotent - the first call wins:

```typescript
markComplete(reason?: string): void {
  if (this._isComplete) return; // Already complete
  this._isComplete = true;
  this._completionReason = reason;
}
```

### 6. Conditional Completion Reversal

**Challenge**: Some blocks might need to "uncomplete" if conditions change (e.g., timer paused then resumed).

**Proposed Design Decision**: Completion is permanent. Once marked complete, a block cannot be unmarked. If a block needs to "pause" completion, it should not mark itself complete until truly done.

**Alternative**: Add `unmarkComplete()` method, but this adds complexity and potential for bugs.

### 7. Performance Considerations

**Challenge**: Sweeping after every action batch adds overhead.

**Mitigation**:
- Sweep only checks `current?.isComplete` - O(1) per iteration
- Most blocks won't be complete, so most sweeps do nothing
- Only traverse when completion is detected

### 8. Integration with Existing Event Handlers

**Challenge**: `NextEventHandler` currently triggers `NextAction` which calls `block.next()`. The sweep would happen after this chain completes.

**Current Flow**:
```
Event → EventBus → NextEventHandler → NextAction → block.next() → [PopBlockAction] → popBlock()
```

**New Flow**:
```
Event → EventBus → NextEventHandler → NextAction → block.next() → [actions, markComplete]
     → processActions() → sweepCompletedBlocks() → popBlock()
```

---

## Migration Plan

### Phase 1: Add Infrastructure (Non-Breaking)

1. Add `isComplete` property and `markComplete()` method to `IRuntimeBlock` and `RuntimeBlock`
2. Add `sweepCompletedBlocks()` to `ScriptRuntime`
3. Call sweep after action processing
4. All existing behaviors continue to work unchanged

### Phase 2: Migrate Behaviors (Gradual)

1. Update `CompletionBehavior` to use `markComplete()`
2. Update `BoundLoopBehavior` to use `markComplete()`
3. Update `SinglePassBehavior` to use `markComplete()`
4. Keep `PopOnNextBehavior` and `PopOnEventBehavior` using `PopBlockAction` initially

### Phase 3: Update Test Infrastructure

1. Update `MockBlock` with `isComplete` support
2. Update `BehaviorTestHarness` to support completion sweeps
3. Add test helpers for asserting on completion state

### Phase 4: Deprecate PopBlockAction from Behaviors

1. Add deprecation warning to `PopBlockAction` when returned from behaviors
2. Migrate remaining behaviors
3. Document new completion pattern

---

## Appendix A: Behaviors to Migrate

| Behavior | Migration Complexity | Notes |
|----------|---------------------|-------|
| `CompletionBehavior` | Low | Generic condition check |
| `BoundLoopBehavior` | Low | Already has `_isComplete` flag |
| `SinglePassBehavior` | Low | Already has `_isComplete` flag |
| `PopOnNextBehavior` | Low | Simple immediate completion |
| `PopOnEventBehavior` | Low | Event-triggered completion |
| `WorkoutFlowStateMachine` | Medium | Complex state transitions |
| `WorkoutOrchestrator` | Medium | Top-level coordination |

---

## Appendix B: Interface Definitions (Complete)

```typescript
// IRuntimeBlock.ts (additions)
export interface IRuntimeBlock {
  // ... existing interface ...
  
  /**
   * Indicates whether this block has completed execution.
   */
  readonly isComplete: boolean;
  
  /**
   * Marks the block as complete. Idempotent - subsequent calls have no effect.
   */
  markComplete(reason?: string): void;
}

// BlockCompletionState.ts (new)
export interface BlockCompletionState {
  isComplete: boolean;
  completedAt?: Date;
  reason?: string;
}

// IScriptRuntime.ts (additions)
export interface IScriptRuntime {
  // ... existing interface ...
  
  /**
   * Performs a completion sweep on the stack, popping all completed blocks.
   */
  sweepCompletedBlocks(): void;
}
```

---

## Conclusion

This redesign separates the concerns of completion detection (behaviors) from completion execution (stack). The stack gains visibility into block completion state and can autonomously clean up completed blocks. This enables:

1. **Simpler behaviors**: No need to construct and return `PopBlockAction`
2. **Reliable history tracking**: Stack-level events on completion
3. **Autonomous cleanup**: Stack can sweep completed blocks after any event
4. **Better debugging**: Completion state is visible on blocks

The main challenges are recursive action processing and backward compatibility, both of which have clear solutions outlined in this document.
