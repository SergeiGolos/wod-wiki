import type { IRuntimeActionable } from './primitives/IRuntimeActionable'
import type { IRuntimeStack } from './IRuntimeStack'
import type { IRuntimeClock } from './IRuntimeClock'
import type { IEventBus } from './events/IEventBus'
import type { IJitCompiler } from './IScriptRuntime'
import type { WhiteboardScript } from '../../parser/WhiteboardScript'
import type { RuntimeError } from '../actions/ErrorAction'
import type { AnalyticsContext } from '../../core/analytics/AnalyticsContext'
import type { INowProvider } from '../INowProvider'
import type { RuntimeStackOptions } from './IRuntimeOptions'
import type { IOutputStatement } from '../../core/models/OutputStatement'
import type { IEvent } from './events/IEvent'

/**
 * IRuntimeContext — what the execution world (actions, blocks, behaviors)
 * receives. The runtime's collaborators (the "bag") plus the verbs to enqueue
 * work and emit output — and nothing else.
 *
 * This is the named seam that replaces reaching the bag through the full
 * {@link IScriptRuntime} god-interface. `handle` is included here because the
 * execution world emits events via it (BehaviorContext.emitEvent); the remaining
 * control verbs (`pushBlock`/`popBlock`/`dispose`) and the observation surface
 * (`subscribeTo*`) stay on `IScriptRuntime` for external drivers.
 *
 * `IRuntimeContext extends IRuntimeActionable`, so it remains a valid narrowing
 * of `IRuntimeAction.do` / `IRuntimeBlock.mount` (which declare the
 * `IRuntimeActionable` primitive to break the `IRuntimeAction ↔ IScriptRuntime`
 * cycle). Concrete actions/blocks narrow their parameter from `IScriptRuntime`
 * to `IRuntimeContext` — bivariance allows it, same trick they use today.
 *
 * `ScriptRuntime` and `ExecutionContext` already satisfy this structurally, so
 * narrowing an action's `do(runtime)` parameter type to `IRuntimeContext`
 * compiles with no runtime change. See docs/adr/runtime-context-seam.md.
 */
export interface IRuntimeContext extends IRuntimeActionable {
    // ── Collaborators (the bag) ──────────────────────────────────────────────
    /** The parsed script being executed. */
    script: WhiteboardScript
    /** The event bus (subscribe/emit within the execution world). */
    eventBus: IEventBus
    /** The block execution stack. */
    stack: IRuntimeStack
    /** The time source (frozen within a turn by `ExecutionContext`). */
    clock: IRuntimeClock
    /** The JIT compiler (statement → block). */
    jit: IJitCompiler
    /** Wall-clock provider. */
    nowProvider: INowProvider
    /** Runtime options (hooks, tracker, wrapper, logger). */
    options: RuntimeStackOptions
    /** Errors collected during execution. */
    errors?: RuntimeError[]
    /** Optional analytics context for compile-time effort enrichment. */
    analyticsContext?: AnalyticsContext

    // ── Emission (the one output verb the execution world uses) ──────────────
    /**
     * Add an output statement and notify subscribers. Used by `BehaviorContext`,
     * `RuntimeBlock`, and `EmitSystemOutputAction` to emit outputs at any
     * lifecycle point. (Phase 2 of the seam renames this to `ctx.output.add`.)
     */
    addOutput(output: IOutputStatement): void

    /**
     * Route an event back through the runtime's dispatch flow. Included because
     * behaviors emit events via `BehaviorContext.emitEvent` → `runtime.handle`.
     * (The remaining control verbs — pushBlock/popBlock/dispose — stay on
     * `IScriptRuntime` for external drivers.)
     */
    handle(event: IEvent): void
}
