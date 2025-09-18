import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeLog } from "../EventHandler";
import { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * Generic, composable behavior contract applied to runtime blocks.
 *
 * Design goals:
 * - Constructor-configurable: concrete behaviors can accept arbitrary args in their constructors
 *   to control how they apply (targets, filters, thresholds, etc.).
 * - Application-time context: every hook receives both the script runtime and the specific block
 *   instance being acted upon.
 * - Optional hooks: implement only what you need; unimplemented hooks are skipped.
 */
export interface IBehavior
{
  /** Called when the owning block is pushed onto the stack. May return initial events to emit. */
  onPush?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[]

  /** Called when determining the next block after a child completes. Return a block to override. */
  onNext?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[]

  /** Called right before the owning block is popped from the stack. */
  onPop?(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeLog[];
}
