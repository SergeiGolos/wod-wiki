import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeEvent, HandlerResponse } from "../EventHandler";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IBehavior } from "./IBehavior";

/**
 * DEPRECATED: Prefer IBehavior which passes the block instance and runtime into each hook.
 * This interface is maintained temporarily for backwards compatibility and will be removed.
 */
export type IRuntimeBehavior = IBehavior & {
  /**
   * Legacy signature shim
   * Note: Implementations should migrate to IBehavior.onAttach(runtime, block)
   */
  onAttach?(runtime: IScriptRuntime, blockOrKey: IRuntimeBlock | string): void;
  onEvent?(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse | undefined;
};
