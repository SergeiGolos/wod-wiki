# Simplification Option 2 — Runtime-Orchestrated Instrumentation

This option moves instrumentation, wrapping, and parent chaining out of the stack into a runtime-owned orchestrator. The stack only validates, stores, and runs lifecycle sequencing; it returns the information (`popped`, `ownerKey`) needed for the runtime to finish cleanup. Use this when you want clear separation of concerns and easier extension of instrumentation without touching `RuntimeStack`.

## Responsibilities
- **RuntimeStack (lean):** validation, depth limits, storage, lifecycle sequencing. `popWithLifecycle` returns `{ popped, ownerKey }`; it no longer ends spans, unregisters handlers, or logs.
- **Runtime/StackOrchestrator:** wraps blocks for debug, starts/ends spans, logs, unregisters event handlers, cleans wrapper registry, and calls `parent.next` after lifecycle pop.
- **Hooks (optional):** `onBeforePush`, `onAfterPush`, `onAfterPop` allow extensibility without modifying the stack.

## API Shape
- `push(block: IRuntimeBlock): void` — stack only validates/stores; runtime performs wrapping/tracking before calling.
- `pop(): IRuntimeBlock | undefined` — raw storage pop; typically used only internally by `popWithLifecycle`.
- `popWithLifecycle(): { popped?: IRuntimeBlock; ownerKey?: string }` — runs unmount → pop → dispose → context.release, then returns references for the orchestrator.
- Hooks interface for optional notifications.

## Flow Details
### push
1) Runtime orchestrator optionally wraps block (debug/test) and starts tracker span/legacy metrics.
2) Runtime calls `stack.push(block)` (stack performs validation + depth enforcement only).
3) Runtime logs or fires hooks after push.

### popWithLifecycle
1) Stack safely runs `current.unmount(runtime)`.
2) Stack pops block from storage and disposes + releases context.
3) Stack returns `{ popped, ownerKey }`.
4) Runtime orchestrator finishes cleanup: `tracker.endSpan(ownerKey)`, `eventBus.unregisterByOwner(ownerKey)`, `wrapper.cleanup(ownerKey)`, logging, and calls `parent.next` with the new `stack.current` if applicable.

## Pros
- Clear separation: stack manages ordering/storage; runtime owns instrumentation and side-effects.
- Easier testing: stack tests focus on lifecycle order; runtime tests cover instrumentation.
- Extensible: new behaviors (perf timers, tracing) live in orchestrator/hooks without stack edits.
- Safer: instrumentation bugs less likely to interfere with core lifecycle sequencing.

## Cons
- Requires runtime changes wherever stack pop/push are called.
- Slightly more verbose orchestration code in runtime.
- More moving parts: stack + orchestrator must stay in sync via return shapes.

## Migration Steps
1) Change `popWithLifecycle` to return `{ popped, ownerKey }`; remove tracker/logging/wrapping from stack.
2) Introduce `StackOrchestrator` (or equivalent) used by `ScriptRuntime` to wrap blocks, start/end spans, unregister, and call `parent.next`.
3) Update runtime code paths to use orchestrator around `stack.push`/`stack.popWithLifecycle`.
4) Update tests: stack tests validate lifecycle ordering and returned ownerKey; runtime/orchestrator tests assert tracker/unregister/wrapper behavior.
5) Keep thin aliases (`MemoryAwareRuntimeStack`, `DebugRuntimeStack`) pointing to the lean stack during transition.

## Decision Signals
Choose Option 2 if:
- You want single-responsibility `RuntimeStack` with instrumentation owned by runtime.
- You plan to extend instrumentation (new metrics, perf timers) without touching the stack.
- You can invest in updating runtime orchestration and tests now.

Risks: Missing orchestrator calls (tracker end, unregister, parent.next) could regress behavior. Mitigate with integration tests that verify spans close, handlers unregister, and `parent.next` fires after pops.