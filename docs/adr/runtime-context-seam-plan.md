# Runtime Context Seam — Implementation Plan
| `IRuntimeContext extends IRuntimeActionable` + bag + `output.add()` + `handle(event)` | Reuse the cycle-breaking primitive; `handle` belongs here too — behaviors emit events via `BehaviorContext.emitEvent` → `runtime.handle` (discovered during implementation) |
Companion to [`runtime-context-seam.md`](./runtime-context-seam.md). That ADR records the
*decision*; this doc records the *how* — the phased, type-checker-gated rollout that lands
the seam without breaking working code.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 9 | `IJitCompiler.compile` and the `IRuntimeBlockStrategy` interface + impls retyped to take `IRuntimeContext` (compiler boundary) | Discovered during Phase 1: the execution world's collaborators (jit compiler, strategies) were typed against `IScriptRuntime`, so the initial retype forced casts at those boundaries. Retyping the compiler contracts removes them; every implementation only uses `IRuntimeContext` members (analyticsContext, options, strategies) |
| 10 | One documented cast remains: `EventSubscriptionActions.handlerFn` as `unknown as IEventHandler` (function-variance boundary — `IEventBus.dispatch` types its handler callback against `IEventDispatchContext`, a narrower primitive kept to break the IEventBus↔IScriptRuntime cycle). Removing it requires either narrowing the event bus to dispatch with `IRuntimeContext` (re-introduces a deliberate type-cycle) or the handlerFn being typed against the dispatch type. Sound at runtime — flagged for a future cleanup. |
| 3 | `ExecutionContext` implements `IRuntimeContext`; the six observation methods come off it | It is already the per-turn frozen-clock object; the execution world never calls them |
| 4 | Read-only `events.on(name, handler)` on the external surface; dispatch behind `handle()` | External drivers only subscribe; dispatch already goes through `handle()` |
| 5 | Observation surface as sub-handles (`output`, `stack`, `tracker`, `events`) | Convention set by the `ctx.output` choice; one shape inside and out |
| 6 | `BlockLifecycle` collaborator composes hooks/tracker/wrapper/logger; `pushBlock`/`popBlock` = before → do → after | Stops hand-sequencing; adding a concern edits one place, not two methods |
| 7 | `BlockLifecycle` scope = external push/pop path only; current behavior preserved | Structural refactor must not change observable behavior (child-push bypass kept) |
| 8 | Phased, additive migration; type-checker-gated; leak removal deferred | `IRuntimeContext` is a structural subset — step 1 is a pure type narrowing |

## Why the migration is safe

`IRuntimeContext` (bag + `do`/`doAll` + `output.add`) is a structural subset of today's
`IScriptRuntime` — the current `ScriptRuntime` already has every field and method it
requires. TypeScript is structural, so **narrowing an action's parameter type from
`IScriptRuntime` to `IRuntimeContext` compiles with zero change to the runtime or its
callers.** The same holds for `ExecutionContext`, which already structurally satisfies
`IRuntimeContext`.

This means every phase except the last is *additive*: the old wide surface and the new
narrow one coexist. The only step that can break anything is removing the old surface, and
by then the type checker proves nothing unmigrated remains.

## Phased rollout

### Phase 1 — Introduce `IRuntimeContext` as a type (pure narrowing)

Goal: the seam exists and is exercised; nothing runs differently.

1. Define `IRuntimeContext` in `src/runtime/contracts/IRuntimeContext.ts`:
   `extends IRuntimeActionable`, adds the bag fields, plus `output: { add(o): void }`.
   (During this phase `output` can be satisfied by the existing flat `addOutput` via a
   thin adapter getter — the runtime keeps `addOutput`; `ctx.output.add` delegates to it.)
2. `ExecutionContext implements IRuntimeContext` (it already does, structurally) — declare
   the type, stop declaring the six observation methods on the context type.
3. Narrow action signatures: `do(runtime: IScriptRuntime)` → `do(ctx: IRuntimeContext)`
   across `src/runtime/actions/**`.
4. Narrow block signatures: `mount`/`next`/`unmount` already take `IRuntimeActionable`
   (`IRuntimeBlock.ts:100,121,156`) — widen to `IRuntimeContext` where they read the bag.
5. Narrow `BehaviorContext` / `BlockContext` / `RuntimeBlock` internal references.

**Verification:** `npm run build` + `npm run test`. All green, no behavior change. This
phase is independently shippable.

### Phase 2 — Add the narrowed external surface alongside the old one

Goal: the narrow `IScriptRuntime` exists; consumers can opt in; nothing is removed.

1. Introduce `events.on(name, handler): Unsubscribe` on the runtime (delegates to
   `eventBus.on`, read-only — no `dispatch`/`register` exposed).
2. Introduce the observe sub-handles (`output`, `stack`, `tracker`) as typed views over
   the existing `OutputEmitter`/`RuntimeObservers` collaborators. Keep the flat
   `subscribeToOutput`/`subscribeToStack`/etc. methods for now.
3. `ScriptRuntime` implements both the old wide surface and the new narrow one.

**Verification:** build + test green. Old consumers untouched.

### Phase 3 — Migrate consumers one at a time

Goal: every external driver crosses the narrow surface; no one reaches the bag.

1. `src/panels/wallclock-panel.tsx:110` — `runtime.eventBus.on('timer:skip-attempt', …)`
   → `runtime.events.on('timer:skip-attempt', …)`.
2. `src/components/organisms/workout/RuntimeDebugPanel.tsx:104,116` —
   `runtime.stack.subscribe` → snapshot observer (or a synchronous-fire variant);
   `runtime.eventBus.register('tick', …)` → `runtime.events.on('tick', …)`.
3. `src/components/atoms/VisualStateComponents.tsx:276` — `runtime.stack.blocks` → read
   from the stack snapshot.
4. The Workbench Session (`src/stores/workbenchSessionStore.ts`) and `RuntimeController`
   already use only control + observe — confirm and retype to the narrow `IScriptRuntime`.

Each consumer is a standalone, reviewable change.

### Phase 4 — Rewrite the test contract

Goal: tests cross the new seams; stop testing past the interface.

1. `__tests__/smoke/application-launch.smoke.test.ts:254-257` — the
   `expect(runtime.jit/stack/clock/eventBus).toBe(…)` assertions move to asserting on the
   `IRuntimeContext` an action receives, or on observable outcomes.
2. Audit other tests that reach the bag (`runtime.options.debug`, `runtime.stack.current`
   in `RuntimeDebugMode.test.ts`, `ScriptRuntimeIteration.test.ts`, etc.) and retype.

**Verification:** behaviour tests (iteration, snapshot, lifecycle, output emission)
unchanged — they already drive the runtime through `do`/`pushBlock`/`handle`.

### Phase 5 — Remove the leak (DEFERRED)

Goal: the bag leaves the public surface. **Optional and gated** — only after Phases 1–4
are settled.

1. Drop the public bag fields (`eventBus`, `clock`, `stack`, `jit`, `options`,
   `nowProvider`, `tracker`, `errors`, `analyticsContext`) from `IScriptRuntime`.
2. Delete the six pass-through observation methods; keep only the sub-handles.
3. `ScriptRuntime` implements `IRuntimeContext` internally (for `ExecutionContext`) and the
   narrow `IScriptRuntime` externally.
4. **Gate:** `tsc` must pass. If it passes, nothing unmigrated remains.

**Verification:** build + full test suite green.

## File inventory (indicative)

| Area | Files | Phase |
|------|-------|-------|
| New contract | `src/runtime/contracts/IRuntimeContext.ts` (new) | 1 |
| Context impl | `src/runtime/ExecutionContext.ts` | 1 |
| Actions | `src/runtime/actions/**` (~25 files: stack, events, audio, tracking, error) | 1 |
| Blocks / behaviors | `src/runtime/RuntimeBlock.ts`, `BehaviorContext.ts`, `BlockContext.ts`, `blocks/**`, `behaviors/**` | 1 |
| Event surface | `ScriptRuntime.ts` (`events.on`) | 2 |
| UI consumers | `src/panels/wallclock-panel.tsx`, `src/components/organisms/workout/RuntimeDebugPanel.tsx`, `src/components/atoms/VisualStateComponents.tsx` | 3 |
| Workbench / controller | `src/stores/workbenchSessionStore.ts`, `src/runtime/RuntimeController.ts` (retype only) | 3 |
| BlockLifecycle | `ScriptRuntime.ts` (`pushBlock`/`popBlock`), new `BlockLifecycle` collaborator, `IRuntimeOptions.ts` | 2 (can land in 1 if preferred) |
| Tests | `__tests__/smoke/application-launch.smoke.test.ts`, `RuntimeDebugMode.test.ts`, `ScriptRuntimeIteration.test.ts`, `ScriptRuntimeSnapshot.test.ts`, … | 4 |
| Leak removal | `IScriptRuntime.ts`, `ScriptRuntime.ts`, `ExecutionContext.ts` | 5 (deferred) |

The "~67 files" grep count (`runtime.(eventBus|clock|stack|jit|options)`) is dominated by
the actions/blocks/behaviors in Phase 1 (mechanical retypes) and tests in Phase 4. The
genuinely load-bearing consumer edits are the three UI files in Phase 3.

## Test strategy — replace, don't layer

Per the deepening discipline: **the interface is the test surface.**

- Behaviour tests survive unchanged — they drive the runtime through its verbs and assert
  on observable outcomes. That is the proof the seam is in the right place.
- Tests that asserted on leaked fields are *rewritten*, not kept alongside. They were
  testing past the interface; the new form asserts on the `IRuntimeContext` an action
  receives, which is what they meant to check.
- New unit tests: `IRuntimeContext` shape (an action receives the bag, can `do`, can
  `output.add`, and nothing else); `BlockLifecycle` ordering invariants (parent captured
  pre-push; tracker span parented correctly; wrapper.cleanup/unregister fire post-pop).

## Risks & non-goals

- **Risk:** the `ctx.output` sub-handle vs flat `addOutput` during Phase 1. Mitigation:
  Phase 1 keeps flat `addOutput` and exposes `ctx.output` as a delegating adapter, so no
  caller changes until the sub-handle is the only form.
- **Risk:** `RuntimeDebugPanel` wants *raw* stack events, not the deferred snapshot.
  Mitigation: Phase 3 either adds a synchronous-fire snapshot variant or exposes a raw
  stack-event observer on the narrow surface (one more observe sub-handle) — decided when
  we reach it.
- **Non-goal:** changing runtime semantics. Observable behavior is preserved, including the
  child-push pipeline bypass (Decision 7).
- **Open follow-up (from the ADR):** is the child-push bypass of tracker/wrapper/hooks
  intended, or a latent bug? Resolve separately — *not* as part of this structural work.

## Suggested first PR

**Phase 1 only** — introduce `IRuntimeContext`, retype actions/blocks/behaviors, ship.
Small, mechanical, zero behavior change, type-checker-verified. The seam is real and
exercised before any consumer migrates or any leak is removed.
