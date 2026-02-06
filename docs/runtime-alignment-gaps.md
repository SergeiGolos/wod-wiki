# Runtime Alignment Gaps

> **Purpose:** Identify where the current codebase diverges from the stated runtime vision, providing a roadmap for bringing code into alignment.

## The Vision (Summary)

The runtime should follow this flow:

1. **External events** (tick, next, pause, resume, start, stop) enter through `runtime.handle(event)`
2. **`handle()`** dispatches the event through the EventBus, which finds eligible handlers and collects the **actions** they return
3. All collected actions execute within a single **ExecutionContext** with a frozen clock
4. **Behaviors** can (a) modify block memory and (b) return actions to affect the stack
5. **Actions** are the only mechanism for stack operations (push/pop)
6. The **`next` call** is dual-purpose: user-triggered advance OR child-pop notification to parent

---

## Gap 1: `eventBus.emit()` Bypasses `handle()`

### Vision
All external events should enter through `runtime.handle(event)`, which dispatches the event, collects actions, and executes them in a single `ExecutionContext` turn with frozen time.

### Current Code
The UI layer and tick loop call `eventBus.emit()` directly, bypassing the `handle()` method entirely.

**Affected Files:**

| File | Line | Call |
|------|------|------|
| `useRuntimeExecution.ts` | 88 | `runtime.eventBus.emit(tickEvent, runtime)` |
| `useRuntimeExecution.ts` | 116-120 | `runtime.eventBus.emit({name: 'timer:resume', ...}, runtime)` |
| `useRuntimeExecution.ts` | 147-151 | `runtime.eventBus.emit({name: 'timer:pause', ...}, runtime)` |
| `useWorkbenchRuntime.ts` | 77 | `runtime.eventBus.emit(new NextEvent(), runtime)` |
| `useWorkbenchRuntime.ts` | 104 | `runtime.eventBus.emit(new NextEvent(), runtime)` |
| `EnhancedTimerHarness.tsx` | 148, 158, 167, 176 | Multiple `runtime.eventBus.emit(...)` calls |
| `StackedClockDisplay.tsx` | 125 | `runtime.eventBus.emit(...)` |
| `TimerDisplay.tsx` | 195 | `runtime.eventBus.emit(...)` |

### Why This Matters
`EventBus.emit()` has a problematic fallback path. When actions are returned by handlers, it tries to use `queueActions` (which doesn't exist on most runtimes) or falls back to executing actions directly via `action.do(runtime)` — outside any `ExecutionContext`, meaning **no frozen clock** and no bounded execution.

```typescript
// EventBus.emit() — current problematic code (EventBus.ts:171-185)
emit(event: IEvent, runtime: IScriptRuntime): void {
    const actions = this.dispatch(event, runtime);
    if (actions && actions.length > 0) {
      // This queueActions doesn't exist on IScriptRuntime!
      const runtimeWithQueue = runtime as IScriptRuntime & { queueActions?: ... };
      if (typeof runtimeWithQueue.queueActions === 'function') {
        runtimeWithQueue.queueActions(actions);
      } else {
        // DANGER: executes actions without ExecutionContext
        for (const action of actions) {
          action.do(runtime);
        }
      }
    }
}
```

### Fix
Replace all `eventBus.emit()` calls with `runtime.handle(event)`:

```typescript
// Before:
runtime.eventBus.emit(tickEvent, runtime);

// After:
runtime.handle(tickEvent);
```

### Severity: **High** — Correctness issue. Actions may execute without frozen clock.

---

## Gap 2: `NextAction` References Non-Existent `queueActions`

### Vision
Actions should use `runtime.do(action)` to queue nested actions. The `ExecutionContext` handles queueing automatically.

### Current Code
`NextAction` (in `src/runtime/actions/stack/NextAction.ts:32-33`) checks for a `queueActions` method that doesn't exist on `IScriptRuntime`:

```typescript
// NextAction.ts:30-38
if (runtime.queueActions && nextActions.length > 0) {
    runtime.queueActions(nextActions);  // This method doesn't exist on the interface!
} else {
    // Fallback for runtimes without queueActions (e.g., mocks)
    for (const action of nextActions) {
        action.do(runtime);
    }
}
```

### Why This Matters
- `queueActions` is not defined on `IScriptRuntime`, so this always falls through to the fallback
- The fallback calls `action.do(runtime)` directly, which works but is misleading — the code suggests a queuing mechanism that doesn't exist
- When called within an `ExecutionContext`, `runtime.do(action)` already queues properly

### Fix
Replace with standard `runtime.do()` pattern:

```typescript
// Before:
if (runtime.queueActions && nextActions.length > 0) {
    runtime.queueActions(nextActions);
} else {
    for (const action of nextActions) {
        action.do(runtime);
    }
}

// After:
for (const action of nextActions) {
    runtime.do(action);
}
```

### Severity: **Medium** — Works by accident but code is misleading and fragile.

---

## Gap 3: `PopBlockAction` Directly Calls `parent.next()` Inline

### Vision
Actions execute stack operations. Block lifecycle methods (`mount`, `next`, `unmount`) return actions. Those actions should be queued through `runtime.do()`.

### Current Code
`PopBlockAction` (in `src/runtime/actions/stack/PopBlockAction.ts:56-62`) calls `parent.next()` inline and then iterates the returned actions with `runtime.do()`:

```typescript
// PopBlockAction.ts:54-62
const parent = runtime.stack.current;
if (parent) {
    const nextActions = parent.next(runtime, lifecycleOptions);
    for (const action of nextActions) {
        runtime.do(action);
    }
}
```

### Assessment
This is actually **acceptable** within the vision. `PopBlockAction` is itself an action executing within an `ExecutionContext`. Calling `runtime.do()` from within an action queues the nested actions in the same turn. The `parent.next()` call is a direct lifecycle invocation, not an event dispatch — it's correctly calling behaviors which return actions.

However, there's a subtle issue: the call to `parent.next()` happens in the same action as `unmount()` and `dispose()`. This means `dispose()` runs on the child **before** the parent's `next()` actions execute, which is correct but tightly couples the pop-next-push sequence.

### Severity: **Low** — Works correctly within the execution model. Could be cleaner with separate actions but no functional issue.

---

## Gap 4: `EmitEventAction` Calls `dispatch()` Instead of `handle()`

### Vision
Internal event emission from behaviors should go through a consistent pipeline.

### Current Code
`EmitEventAction` (in `src/runtime/actions/events/EmitEventAction.ts:41`) calls `eventBus.dispatch()` directly:

```typescript
// EmitEventAction.ts:34-42
do(runtime: IScriptRuntime): void {
    const event: IEvent = {
      name: this.eventName,
      timestamp: this.timestamp,
      data: this.data
    };
    runtime.eventBus.dispatch(event, runtime);  // Returns actions but doesn't execute them!
}
```

### Why This Matters
`dispatch()` returns `IRuntimeAction[]` but `EmitEventAction` **ignores the return value**. If any handler returns actions in response to this event, those actions are silently dropped.

### Fix
Use `runtime.handle(event)` which properly processes returned actions:

```typescript
// Before:
runtime.eventBus.dispatch(event, runtime);

// After:
runtime.handle(event);
```

Or if we want actions to queue in the current turn:

```typescript
const actions = runtime.eventBus.dispatch(event, runtime);
for (const action of actions) {
    runtime.do(action);
}
```

### Severity: **High** — Silent action loss. Any handler that returns actions from an emitted event will have those actions dropped.

---

## Gap 5: `BehaviorContext.emitEvent()` Calls `dispatch()` — Drops Actions

### Vision
When a behavior emits an event for coordination, any actions returned by handlers should be processed.

### Current Code
`BehaviorContext.emitEvent()` (in `src/runtime/BehaviorContext.ts:77`) calls `dispatch()` and ignores the returned actions:

```typescript
// BehaviorContext.ts:76-78
emitEvent(event: IEvent): void {
    this.runtime.eventBus.dispatch(event, this.runtime);
    // Actions returned by dispatch() are SILENTLY DROPPED
}
```

### Why This Matters
Same as Gap 4 — any actions returned by handlers processing the emitted event are lost.

### Fix
Process returned actions through `runtime.do()`:

```typescript
emitEvent(event: IEvent): void {
    const actions = this.runtime.eventBus.dispatch(event, this.runtime);
    for (const action of actions) {
        this.runtime.do(action);
    }
}
```

### Severity: **High** — Silent action loss from behavior-emitted events.

---

## Gap 6: `BehaviorContext.subscribe()` Always Uses Default (Active) Scope

### Vision
Behaviors should be able to listen to events at different scope levels. Parent blocks need to hear child events (e.g., `TimerCompletionBehavior` on an AMRAP needs tick events even when a child effort block is active).

### Current Code
`BehaviorContext.subscribe()` (in `src/runtime/BehaviorContext.ts:52-69`) registers handlers with no scope option, which defaults to `'active'`:

```typescript
// BehaviorContext.ts:62-66
const unsub = this.runtime.eventBus.register(
    eventType,
    handler,
    this.block.key.toString()
    // No options! Defaults to scope: 'active'
);
```

### Why This Matters
The `TimerCompletionBehavior` on an AMRAP block subscribes to `timer:tick` events. But when a child effort block is on top of the stack, the AMRAP is not the `active` block — its tick handler won't fire with `'active'` scope.

Currently the code may work because tick events are emitted via `eventBus.emit()` which has different dispatch behavior, but this is fragile and doesn't align with the scoping model described in the EventBus documentation.

### Fix
Allow `subscribe()` to accept a scope parameter:

```typescript
subscribe(
    eventType: BehaviorEventType,
    listener: BehaviorEventListener,
    options?: { scope?: HandlerScope }
): Unsubscribe {
    // ... handler creation ...
    const unsub = this.runtime.eventBus.register(
        eventType,
        handler,
        this.block.key.toString(),
        { scope: options?.scope ?? 'active' }
    );
    // ...
}
```

Then behaviors that need to hear events while children are active can use `scope: 'bubble'`:

```typescript
// TimerCompletionBehavior — needs ticks even when child is active
ctx.subscribe('timer:tick', handler, { scope: 'bubble' });
```

### Severity: **High** — Timer completion on parent blocks may not fire correctly when children are active.

---

## Gap 7: `BlockContext.dispatch()` Calls — Mixed Patterns

### Vision
Memory events dispatched from `BlockContext` should follow the same pattern as other events.

### Current Code
`BlockContext` (in `src/runtime/BlockContext.ts:76, 108, 124`) calls `runtime.eventBus.dispatch()` for memory lifecycle events (`memory:allocate`, `memory:set`, `memory:release`). These calls return actions that are ignored.

### Assessment
In practice, no handlers currently return actions for memory events — they're informational/diagnostic. But the pattern is inconsistent: if a handler were added that returns actions on memory events, those actions would be dropped.

### Severity: **Low** — No current functional impact, but inconsistent pattern.

---

## Gap 8: `RuntimeBlock.unmount()` Dispatches Event Outside Action System

### Vision
Events emitted during block lifecycle should participate in the action system.

### Current Code
`RuntimeBlock.unmount()` (in `src/runtime/RuntimeBlock.ts:244-248`) dispatches an `unmount` event directly on the EventBus:

```typescript
// RuntimeBlock.ts:243-248
runtime.eventBus.dispatch({
    name: 'unmount',
    timestamp: runtime.clock.now,
    data: { blockKey: this.key.toString() }
}, runtime);
```

This call's return value (actions[]) is also silently ignored.

### Severity: **Medium** — Unmount event handlers cannot produce actions that affect the stack.

---

## Gap 9: Test Harnesses Use `emit()` Instead of `handle()`

### Vision
Test code should exercise the same code paths as production code.

### Current Code
Multiple test harnesses call `eventBus.emit()` directly:

| File | Lines |
|------|-------|
| `TestableRuntime.ts` | 432, 444, 457, 474, 487, 504 |
| `ExecutionContextTestHarness.ts` | 298 |
| `BehaviorTestHarness.ts` | 80, 264 |
| `QueueTestHarness.tsx` | 538 |

### Assessment
Test harnesses intentionally bypass `handle()` for test isolation. However, `TestableRuntime` wraps `ScriptRuntime` and has access to `handle()`. The test harness pattern should match production.

### Severity: **Low** — Test code, but using the wrong entry point may miss bugs.

---

## Gap 10: `TickEvent` Uses Event Name `timer:tick`, Not `tick`

### Vision
The state machine document references `tick` events, but the code uses a different name.

### Current Code
`TickEvent` (in `src/runtime/events/NextEvent.ts:4`) uses event name `'timer:tick'`:

```typescript
export class TickEvent implements IEvent {
  readonly name: string = 'timer:tick';  // Note: "timer:tick", not "tick"
  // ...
}
```

But behaviors may subscribe to `'tick'` or `'timer:tick'` depending on the behavior. This inconsistency can cause missed events.

### Severity: **Medium** — Naming inconsistency may cause subtle handler mismatches.

---

## Summary Table

| # | Gap | Where | Severity | Impact |
|---|-----|-------|----------|--------|
| 1 | `eventBus.emit()` bypasses `handle()` | UI hooks, components | **High** | Actions execute without frozen clock |
| 2 | `NextAction` references non-existent `queueActions` | NextAction.ts | **Medium** | Misleading code, works by accident |
| 3 | `PopBlockAction` inlines `parent.next()` | PopBlockAction.ts | **Low** | Acceptable but tightly coupled |
| 4 | `EmitEventAction` drops returned actions | EmitEventAction.ts | **High** | Silent action loss |
| 5 | `BehaviorContext.emitEvent()` drops returned actions | BehaviorContext.ts | **High** | Silent action loss |
| 6 | `subscribe()` always uses active scope | BehaviorContext.ts | **High** | Parent timer behaviors may not fire |
| 7 | `BlockContext.dispatch()` drops returned actions | BlockContext.ts | **Low** | Inconsistent, no current impact |
| 8 | `unmount()` dispatches outside action system | RuntimeBlock.ts | **Medium** | Unmount handlers can't produce actions |
| 9 | Test harnesses use `emit()` not `handle()` | Testing files | **Low** | Tests may miss production bugs |
| 10 | Event name inconsistency (`tick` vs `timer:tick`) | NextEvent.ts | **Medium** | Handler registration mismatches |

---

## Recommended Fix Order

### Phase 1: Fix Action Loss (Gaps 4, 5)
These are silent data loss bugs. Fix `EmitEventAction.do()` and `BehaviorContext.emitEvent()` to process returned actions.

### Phase 2: Route Through `handle()` (Gap 1)  
Update all UI-layer code to use `runtime.handle(event)` instead of `eventBus.emit()`. This ensures all external events get frozen-clock execution contexts.

### Phase 3: Clean Up `NextAction` (Gap 2)
Remove the `queueActions` reference and use `runtime.do()` consistently.

### Phase 4: Add Scope Support to `subscribe()` (Gap 6)
Enable behaviors to specify handler scope, fixing parent timer behavior isolation.

### Phase 5: Minor Cleanups (Gaps 7, 8, 10)
Address naming inconsistencies and remaining dispatch pattern issues.

### Phase 6: Test Alignment (Gap 9)
Update test harnesses to use `handle()` where appropriate.

---

## Related Documents

- [[runtime-state-machine]] — The canonical state machine model this gap analysis references
- [[behavior-refactoring-guide]] — Behavior SRP analysis (separate concern from this document)
