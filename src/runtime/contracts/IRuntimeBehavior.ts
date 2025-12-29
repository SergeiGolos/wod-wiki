import { IEvent } from "./IEvent";
import { IRuntimeAction } from "./IRuntimeAction";
import { BlockLifecycleOptions, IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";

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

export interface IRuntimeBehavior {
  /** Called when the owning block is pushed onto the stack. May return initial events to emit. */
  onPush?(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[];

  /** Called when determining the next block after a child completes. Return a block to override. */
  onNext?(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[];

  /** Called right before the owning block is popped from the stack. */
  onPop?(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[];

  /** Called when the block is being disposed. Use this to clean up resources or log final metrics. */
  onDispose?(block: IRuntimeBlock): void;

  /** Called when an event is dispatched to the block. */
  onEvent?(event: IEvent, block: IRuntimeBlock): IRuntimeAction[];
}
