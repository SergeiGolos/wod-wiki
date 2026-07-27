# Runtime Context Seam

**Status:** Accepted · **Date:** 2026-06-28

Split `ScriptRuntime`'s single god-interface into a narrow external surface and a
named execution context, so the runtime stops leaking its collaborators (`eventBus`,
`clock`, `stack`, `jit`, `options`) through its public interface. We do this because
the leak is structural — 67 files reach through it, the runtime's own `ExecutionContext`
re-declares the whole bag as getters, and the smoke tests assert on the leaked fields —
and because the workbench/cast/UI consumers only ever need a fraction of what the bag
exposes.

## Context

`IScriptRuntime` (`src/runtime/contracts/IScriptRuntime.ts`) declares three unrelated
concerns as one flat surface: the **collaborator bag** (public fields), the **execution
verbs** (`do`/`doAll`/`handle`/`pushBlock`/`popBlock`/`dispose`), and the **observation
surface** (`subscribeToOutput`/`subscribeToStack`/`subscribeToTracker`/…). It is the
worst-health module in the repo (1.0/10).

The bag is not accidental leakage — actions, blocks, and behaviors genuinely need it.
`PushBlockAction.do(runtime)` touches `runtime.stack`, `runtime.clock`, and calls
`block.mount(runtime)`. The problem is that this real dependency is smuggled through the
runtime's *public* surface instead of being named, so every external consumer (and every
test) can also reach it. `ExecutionContext` already wraps the runtime with a frozen
`SnapshotClock` and re-exposes the entire bag as getters — i.e. the per-turn context is
*already a distinct object*, just typed against the wrong (full) interface.

## Decision

Two interfaces where there was one:

- **`IRuntimeContext extends IRuntimeActionable`** — the bag (`script`, `eventBus`,
  `stack`, `clock`, `jit`, `options`, `nowProvider`, `errors`, `analyticsContext`,
  `tracker`) plus `do`/`doAll` plus an `output` sub-handle (`ctx.output.add(...)`).
  This is what actions, blocks, and behaviors receive. **Implemented by
  `ExecutionContext`** (already the per-turn object). The six observation methods
  (`subscribeTo*`, `setAnalyticsEngine`, `finalizeAnalytics`, `getOutputStatements`)
  come *off* the context — the execution world never calls them; only `addOutput` is
  used (by `BehaviorContext`, `RuntimeBlock`, `EmitSystemOutputAction`).

- **`IScriptRuntime` (narrowed)** — the external surface for the Workbench Session,
  `RuntimeController`, cast bridges, and UI panels:
  - *control*: `do` · `doAll` · `handle` · `pushBlock` · `popBlock` · `dispose`
  - *observe*: `output` · `stack` (snapshot) · `tracker` · **`events.on(name, handler)`**
    (new — a read-only event-subscribe). Event **dispatch** stays internal, behind
    `handle()`.

A **`BlockLifecycle` collaborator** composes the four cross-cutting concerns already
typed in `IRuntimeOptions` (`RuntimeStackHooks`, `RuntimeStackTracker`,
`RuntimeStackWrapper`, `RuntimeStackLogger`) and owns both their configuration and their
sequencing. `pushBlock`/`popBlock` collapse to `before → do(action) → after`.

**Migration is phased and type-checker-gated.** `IRuntimeContext` is a structural subset
of today's `IScriptRuntime`, so the current `ScriptRuntime` satisfies it with zero code
change — the first step is a pure type narrowing. The old wide surface and the new narrow
one coexist; the leak is removed only in a final, optional, type-checker-gated step.

## Considered Options

**How to serve domain-event listeners (`wallclock-panel` listens to `timer:skip-attempt`,
`RuntimeDebugPanel` to `tick`) once the event bus leaves the public surface:**
- **(a) A read-only `events.on` on the surface; dispatch behind `handle()`. — CHOSEN.**
  Matches the existing split (external drivers only *subscribe*; they *dispatch* through
  `handle()`). Small surface, two consumers migrate.
- (b) Keep `eventBus` deliberately exposed. — honest but the leak partially persists; no
  real gain.
- (c) Route UI events through the output/tracker channels. — distorts channels designed
  for other purposes.

**Emission verb shape:** `ctx.output.add(...)` sub-handle **— CHOSEN** over flat
`addOutput` on the context, so the context is purely "read the bag + enqueue." Sets the
sub-handle convention used on the external surface too.

**`BlockLifecycle` scope:** external push/pop path only, current behavior preserved
(child-block pushes via `PushBlockAction` keep bypassing spans/wrapper/hooks) **— CHOSEN**.
Widening to child pushes was rejected: it changes observable behavior (spans appear where
they didn't) and that is a separate decision needing its own tests, not something to
smuggle into a structural refactor. *Open follow-up:* confirm whether the bypass is
intended or a latent bug.

**Migration shape:** phased, additive, type-checker-gated **— CHOSEN** over a single
big-bang PR that removes the leak in the same change. Steps 1–4 are additive; only step 5
(removal) can break anything, and only if a consumer is unmigrated — provable with the
type checker.

## Consequences

- **Two interfaces exist during transition.** `ScriptRuntime` implements both the old
  wide `IScriptRuntime` and the new `IRuntimeContext` until the leak is removed. This is
  deliberate and temporary.
- **The test contract changes.** Assertions like `expect(runtime.jit).toBe(compiler)`
  (`__tests__/smoke/application-launch.smoke.test.ts:254-257`) were testing past the
  interface; they move to asserting on the context an action receives. Behaviour tests
  (iteration, snapshot, lifecycle, output emission) are unchanged — they already cross
  the right seam.
- **The leak removal (final step) is deferred and optional.** The deepening is valuable
  before the old surface is gone; removal is gated on all consumers migrated.
- **Future architecture reviews should not re-suggest** exposing the bag, adding a third
  runtime interface, or widening `BlockLifecycle` to child pushes without first resolving
  the open follow-up above.

## Non-goals

- Changing runtime *semantics*. This is a structural deepening; observable behavior is
  preserved (including the child-push pipeline bypass).
- Re-litigating the runtime's execution model (turns, LIFO work-list, frozen clock) —
  those are retained, just named.
