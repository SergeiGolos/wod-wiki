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

## Gap 1: ~~`eventBus.emit()` Bypasses `handle()`~~ ✅ RESOLVED

> **Fixed in:** `eff393a` — All UI-layer `eventBus.emit()` calls replaced with `runtime.handle(event)`. Affected files: `useRuntimeExecution.ts`, `useWorkbenchRuntime.ts`, `EnhancedTimerHarness.tsx`, `StackedClockDisplay.tsx`, `TimerDisplay.tsx`, `PlaySoundAction.ts`.

---

## Gap 2: ~~`NextAction` References Non-Existent `queueActions`~~ ✅ RESOLVED

> **Fixed in:** `ec2066c` — `NextAction` and `EventBus.emit()` now use `runtime.do(action)` exclusively. The `queueActions` fallback code has been removed. `ExecutionContext` now uses LIFO stack processing for depth-first action chain execution.

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

## Gap 4: ~~`EmitEventAction` Calls `dispatch()` Instead of `handle()`~~ ✅ RESOLVED

> **Fixed in:** `eff393a` — `EmitEventAction.do()` now processes actions returned by `eventBus.dispatch()` via `runtime.do()` instead of silently dropping them. Actions are pushed in reverse order for LIFO stack processing.

---

## Gap 5: ~~`BehaviorContext.emitEvent()` Calls `dispatch()` — Drops Actions~~ ✅ RESOLVED

> **Fixed in:** `eff393a` — `BehaviorContext.emitEvent()` now processes returned actions via `runtime.do()` instead of silently dropping them.

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
`TickEvent` (defined in `src/runtime/events/NextEvent.ts:3-15`, co-located with `NextEvent` despite being unrelated) uses event name `'timer:tick'`:

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

| # | Gap | Where | Severity | Status |
|---|-----|-------|----------|--------|
| 1 | ~~`eventBus.emit()` bypasses `handle()`~~ | UI hooks, components | ~~High~~ | ✅ **RESOLVED** — all UI calls use `handle()` |
| 2 | ~~`NextAction` references `queueActions`~~ | NextAction.ts | ~~Medium~~ | ✅ **RESOLVED** — uses `runtime.do()` now |
| 3 | `PopBlockAction` inlines `parent.next()` | PopBlockAction.ts | **Low** | Acceptable — properly uses LIFO stack now |
| 4 | ~~`EmitEventAction` drops returned actions~~ | EmitEventAction.ts | ~~High~~ | ✅ **RESOLVED** — processes via `runtime.do()` |
| 5 | ~~`BehaviorContext.emitEvent()` drops actions~~ | BehaviorContext.ts | ~~High~~ | ✅ **RESOLVED** — processes via `runtime.do()` |
| 6 | `subscribe()` always uses active scope | BehaviorContext.ts | **High** | Open |
| 7 | `BlockContext.dispatch()` drops returned actions | BlockContext.ts | **Low** | Open |
| 8 | `unmount()` dispatches outside action system | RuntimeBlock.ts | **Medium** | Open |
| 9 | Test harnesses use `emit()` not `handle()` | Testing files | **Low** | Open |
| 10 | Event name inconsistency (`tick` vs `timer:tick`) | NextEvent.ts | **Medium** | Open |

---

## Recommended Fix Order

### ~~Phase 3: Clean Up `NextAction` (Gap 2)~~ ✅ DONE
Removed the `queueActions` reference. `NextAction` and `EventBus.emit()` now use `runtime.do()` consistently. `ExecutionContext` uses LIFO stack (depth-first) processing.

### ~~Phase 1: Fix Action Loss (Gaps 4, 5)~~ ✅ DONE
`EmitEventAction.do()` and `BehaviorContext.emitEvent()` now process actions returned by `eventBus.dispatch()` via `runtime.do()`.

### ~~Phase 2: Route Through `handle()` (Gap 1)~~ ✅ DONE
All UI-layer `eventBus.emit()` calls replaced with `runtime.handle(event)`. This ensures all external events get frozen-clock execution contexts.

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
