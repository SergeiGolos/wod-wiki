import type { IRuntimeActionable } from "./primitives/IRuntimeActionable";

/**
 * Interface for actions that can be performed by the runtime in response to events.
 *
 * Actions return child actions instead of pushing them onto the runtime directly.
 * The ExecutionContext collects returned actions and pushes them onto its internal
 * LIFO stack, ensuring depth-first processing without actions needing to know
 * about stack mechanics.
 *
 * The `do()` method receives the runtime via the {@link IRuntimeActionable}
 * primitive instead of `IScriptRuntime`. This breaks the cycle
 * `IRuntimeAction ↔ IScriptRuntime`. Concrete implementations are free to
 * narrow their parameter type to `IScriptRuntime` (method bivariance allows
 * this), and callers always pass an `IScriptRuntime` since `IScriptRuntime
 * extends IRuntimeActionable`.
 */

export interface IRuntimeAction {
  /** Type of action to perform */
  type: string;

  /** Target of the action (optional) */
  target?: string;

  /** Action payload/data */
  payload?: unknown;

  /**
   * Executes the action within the given runtime context.
   *
   * Returns child actions that should be executed next. The ExecutionContext
   * pushes returned actions onto its LIFO stack for depth-first processing.
   * Actions should NOT call runtime.do() or runtime.doAll() — just return
   * the actions they want executed.
   *
   * @returns Array of child actions to execute, or void/empty array for none
   */
  do(runtime: IRuntimeActionable): IRuntimeAction[] | void;
}
