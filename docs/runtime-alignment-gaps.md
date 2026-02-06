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

## Gap 3: ~~`PopBlockAction` Directly Calls `parent.next()` Inline~~ ✅ RESOLVED

> **Fixed in:** `PopBlockAction` no longer calls `parent.next()` inline. Instead, after unmount/pop/dispose, it returns a `new NextAction(lifecycleOptions)` which the ExecutionContext processes as a separate action. `NextAction` was extended to accept optional `BlockLifecycleOptions` (carrying `completedAt`, clock snapshots, etc.), merging them with its own snapshot clock. This cleanly decouples the pop and next phases into distinct actions while preserving lifecycle option propagation.

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

### Reassessment
The `TimerCompletionBehavior` on an AMRAP block subscribes to `'tick'` events. When a child effort block is on top of the stack, the AMRAP is not the `active` block — its tick handler won't fire with `'active'` scope.

The EventBus already supports `'bubble'` and `'global'` scopes (see `EventBus.dispatch()` filtering at lines 139-152). The infrastructure exists — `BehaviorContext.subscribe()` simply doesn't expose it.

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
ctx.subscribe('tick', handler, { scope: 'bubble' });
```

### Severity: **High** — Timer completion on parent blocks may not fire correctly when children are active.

---

## Gap 7: `BlockContext.dispatch()` Calls — Mixed Patterns

### Vision
Memory events dispatched from `BlockContext` should follow the same pattern as other events.

### Current Code
`BlockContext` (in `src/runtime/BlockContext.ts:76, 108, 124`) calls `runtime.eventBus.dispatch()` for memory lifecycle events (`memory:allocate`, `memory:set`, `memory:release`). These calls return actions that are ignored.

### Reassessment
No handlers currently return actions for memory events — they're informational/diagnostic. The pattern is inconsistent but harmless. Processing returned actions here could also introduce subtle side effects during memory operations which are called frequently.

Recommendation: Leave as-is unless a concrete use case emerges for memory-event-driven actions. If needed, these calls could process returned actions via `runtime.do()`.

### Severity: **Low** — No current functional impact, inconsistent but defensible pattern.

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

This call's return value (`IRuntimeAction[]`) is silently ignored.

### Reassessment
The unmount dispatch is diagnostic — it notifies observers that a block was unmounted. Currently no handlers return actions for unmount events. However, the return value should either be:
- Collected and returned as part of `unmount()`'s `IRuntimeAction[]` return, or
- Processed through `runtime.do()` for consistency

The first option is cleanest since `unmount()` already returns actions.

### Fix
```typescript
const unmountEventActions = runtime.eventBus.dispatch({
    name: 'unmount',
    timestamp: runtime.clock.now,
    data: { blockKey: this.key.toString() }
}, runtime);
actions.push(...unmountEventActions);
```

### Severity: **Medium** — Unmount event handlers cannot produce actions that affect the stack.

---

## Gap 9: ~~Test Harnesses Use `emit()` Instead of `handle()`~~ ✅ RESOLVED

> **Fixed in:** All test harnesses now use the production entry point instead of `eventBus.emit()`:
> - **BehaviorTestHarness**: Mock `handle()` calls `eventBus.dispatch()` + `doAll()` (mirrors `ScriptRuntime.handle()`), fixing infinite recursion. `simulateEvent()` calls `handle()` instead of `emit()`.
> - **ExecutionContextTestHarness**: `dispatchEvent()` calls `runtime.handle()` instead of `eventBus.emit()`.
> - **TestableRuntime**: All 6 simulate methods (`simulateTick`, `simulateNext`, `simulateReps`, `simulateTimerEvent`, `simulateRoundComplete`, `simulateEvent`) call `this.handle()` instead of `this.eventBus.emit()`.
> - **QueueTestHarness**: Button click handler calls `testRuntime.handle()` instead of `testRuntime.eventBus.emit()`.

---

## Gap 10: ~~`TickEvent` Uses Event Name `timer:tick`, Not `tick`~~ ✅ RESOLVED

> **Fixed in:** `TickEvent.name` renamed from `'timer:tick'` to `'tick'` to match behavior subscriptions. `TickEvent` moved from `NextEvent.ts` into its own `TickEvent.ts` file. Updated imports in `useRuntimeExecution.ts`, `events/index.ts`. Updated doc references in `runtime-state-machine.md` and `testing/skill.md`. All 609 unit tests pass.

---

## Summary Table

| # | Gap | Where | Severity | Status |
|---|-----|-------|----------|--------|
| 1 | ~~`eventBus.emit()` bypasses `handle()`~~ | UI hooks, components | ~~High~~ | ✅ **RESOLVED** — all UI calls use `handle()` |
| 2 | ~~`NextAction` references `queueActions`~~ | NextAction.ts | ~~Medium~~ | ✅ **RESOLVED** — uses `runtime.do()` now |
| 3 | ~~`PopBlockAction` inlines `parent.next()`~~ | PopBlockAction.ts | ~~Low~~ | ✅ **RESOLVED** — returns `NextAction` instead |
| 4 | ~~`EmitEventAction` drops returned actions~~ | EmitEventAction.ts | ~~High~~ | ✅ **RESOLVED** — processes via `runtime.do()` |
| 5 | ~~`BehaviorContext.emitEvent()` drops actions~~ | BehaviorContext.ts | ~~High~~ | ✅ **RESOLVED** — processes via `runtime.do()` |
| 6 | `subscribe()` always uses active scope | BehaviorContext.ts | **High** | Open |
| 7 | `BlockContext.dispatch()` drops returned actions | BlockContext.ts | **Low** | Open (Won't Fix) |
| 8 | `unmount()` dispatches outside action system | RuntimeBlock.ts | **Medium** | Open |
| 9 | ~~Test harnesses use `emit()` not `handle()`~~ | ~~Testing files~~ | ~~Medium~~ | ✅ **RESOLVED** — all use `handle()`/`dispatch()` |
| 10 | ~~Event name mismatch (`tick` vs `timer:tick`)~~ | ~~NextEvent.ts~~ | ~~High~~ | ✅ **RESOLVED** — `TickEvent.name` is now `'tick'` |

---

## Recommended Fix Order

### ~~Phase 1: Fix Action Loss (Gaps 2, 4, 5)~~ ✅ DONE
Removed the `queueActions` reference. `NextAction` and `EventBus.emit()` now use `runtime.do()` consistently. `EmitEventAction.do()` and `BehaviorContext.emitEvent()` now process actions returned by `eventBus.dispatch()` via `runtime.do()`.

### ~~Phase 2: Route Through `handle()` (Gap 1)~~ ✅ DONE
All UI-layer `eventBus.emit()` calls replaced with `runtime.handle(event)`. This ensures all external events get frozen-clock execution contexts.

### ~~Phase 3: Decouple Pop from Next (Gap 3)~~ ✅ DONE
`PopBlockAction` no longer calls `parent.next()` inline. Returns `new NextAction(lifecycleOptions)` for the ExecutionContext to process as a separate action.

---

### ~~Phase 4: Fix Event Name Mismatch (Gap 10)~~ ✅ DONE
`TickEvent.name` renamed from `'timer:tick'` to `'tick'`. `TickEvent` moved to its own file. Imports and docs updated. All 609 tests pass.

### ~~Phase 5: Fix Test Harness Infinite Loop (Gap 9)~~ ✅ DONE
All test harnesses now use `runtime.handle()` or `eventBus.dispatch()` instead of `eventBus.emit()`. BehaviorTestHarness mock `handle()` mirrors `ScriptRuntime.handle()` — calls `dispatch()` + `doAll()`. Infinite recursion bug eliminated.

### Phase 6: Add Scope Support to `subscribe()` (Gap 6) — **IMPORTANT**

**Why next:** Parent timer behaviors (e.g., `TimerCompletionBehavior` on an AMRAP) need to hear tick events even when a child effort block is active. This is a functional gap.

**Tasks:**
1. Update `IBehaviorContext.subscribe()` signature to accept optional `{ scope?: HandlerScope }`
2. Update `BehaviorContext.subscribe()` implementation to pass scope to `eventBus.register()`
3. Default scope remains `'active'` for backward compatibility
4. Update `TimerCompletionBehavior` to use `scope: 'bubble'`
5. Update `TimerTickBehavior` to use `scope: 'bubble'` (parent needs timer updates too)
6. Update `SoundCueBehavior` to use appropriate scope
7. Add tests for scope-filtered behavior subscriptions

**Risk:** Medium — changing scope could cause behaviors to fire in unexpected contexts. Needs careful per-behavior analysis.

### Phase 7: Unmount Event Actions (Gap 8) — **LOW PRIORITY**

**Why last:** No unmount handlers currently return actions. Fix for completeness.

**Tasks:**
1. Capture return value of `runtime.eventBus.dispatch()` in `RuntimeBlock.unmount()`
2. Push returned actions into the `actions` array that `unmount()` returns
3. Add test verifying unmount event handlers can produce actions

**Risk:** Low — additive change, no existing behavior changes.

### Gap 7 — **WON'T FIX** (unless needed)

`BlockContext.dispatch()` for memory events is intentionally fire-and-forget. Memory events are diagnostic — processing returned actions during high-frequency memory operations could introduce performance issues or unintended side effects. Revisit only if a concrete use case emerges.

---

## Completion Criteria

All gaps are resolved when:

1. **Single entry point:** All events enter through `runtime.handle(event)` ✔️
2. **Action-only stack operations:** All stack changes go through actions ✔️
3. **No dropped actions:** Every `dispatch()` return value is processed ✔️ (except Gap 7)
4. **Consistent event names:** `TickEvent.name` matches behavior subscriptions ✔️
5. **Scope-aware subscriptions:** Parent behaviors can hear child events ⬜ Phase 6
6. **Test fidelity:** Test harnesses use the same entry points as production ✔️
7. **Complete lifecycle participation:** Unmount events can produce actions ⬜ Phase 7

---

## Related Documents

- [[runtime-state-machine]] — The canonical state machine model this gap analysis references
- [[behavior-refactoring-guide]] — Behavior SRP analysis (separate concern from this document)
