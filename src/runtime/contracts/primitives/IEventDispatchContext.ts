/**
 * Runtime context surface required by {@link IEventBus} dispatchers,
 * handlers, and callbacks.
 *
 * Extends {@link IRuntimeActionable} (so callers can queue follow-up
 * actions) with the minimal accessors the event bus actually consumes:
 *
 * - `stack` — used for handler scope filtering ('active' vs 'bubble' vs
 *   'global'). Only the keys are needed, so the shape is intentionally
 *   minimal and does not import `IRuntimeStack` / `IRuntimeBlock`.
 * - `errors` — used by `dispatch()` to short-circuit handler chains when
 *   a previous handler pushed a `RuntimeError`.
 * - `handle(event)` — used by `emit()` to route the event back through
 *   the runtime's own dispatch flow.
 *
 * Defining this primitive (instead of typing the bus parameters as the
 * looser {@link IRuntimeActionable}) prevents the
 * `IEventBus ↔ IScriptRuntime` cycle while keeping the contract
 * type-accurate so callers cannot pass a stub that only provides
 * `do()`/`doAll()` and crash at runtime when the bus reaches for
 * `runtime.stack`.
 */
import type { IRuntimeActionable } from './IRuntimeActionable';

/** Minimal stack snapshot accessor used by event-scope filtering. */
export interface IEventDispatchStack {
    /** The current (top-of-stack) block reference, if any. */
    readonly current: { readonly key: { toString(): string } } | undefined;

    /** Block keys for every block on the stack, bottom-to-top. */
    readonly keys: ReadonlyArray<{ toString(): string }>;
}

export interface IEventDispatchContext extends IRuntimeActionable {
    /** Stack accessor used for handler scope filtering. */
    readonly stack: IEventDispatchStack;

    /**
     * Optional list of accumulated runtime errors. The bus uses
     * `errors.length` to short-circuit handler chains.
     */
    readonly errors?: ReadonlyArray<unknown>;

    /**
     * Route an event back through the runtime's own dispatch flow.
     * Used by `IEventBus.emit()`.
     */
    handle(event: { readonly name: string; readonly timestamp: Date; readonly data?: unknown }): void;
}
