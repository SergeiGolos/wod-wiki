import { IRuntimeAction } from "./IRuntimeAction";
import { IBehaviorContext } from "./IBehaviorContext";

/**
 * Generic, composable behavior contract applied to runtime blocks.
 * 
 * New Design (Phase 2+): behaviors interact purely via IBehaviorContext.
 * 
 * Design goals:
 * - Constructor-configurable: concrete behaviors can accept arbitrary args in their constructors.
 * - Context-driven: every hook receives IBehaviorContext.
 * - Optional hooks: implement only what you need.
 */
export interface IRuntimeBehavior {
  /**
   * Called when the owning block is mounted.
   * Use ctx.subscribe() to listen for events and ctx.emitOutput() for initial reports.
   * Use ctx.pushMemory() to initialize block state.
   */
  onMount(ctx: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when parent.next() is invoked (child completed or manual advance).
   * 
   * This is the signal to advance the block's internal state (e.g., next round).
   * If the block is finished, call ctx.markComplete().
   */
  onNext(ctx: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when the owning block is about to be unmounted.
   * Use ctx.emitOutput() to report final completion fragments.
   * Subscriptions are automatically cleaned up *after* this method returns.
   */
  onUnmount(ctx: IBehaviorContext): IRuntimeAction[];

  /**
   * Called when the block is being disposed.
   * Final cleanup hook.
   */
  onDispose(ctx: IBehaviorContext): void;

  /**
   * Legacy API: called when a block is pushed onto the stack.
   * Superseded by onMount. Retained for backward-compatible mock behaviors.
   */
  onPush?(block: any, clock: any): IRuntimeAction[];

  /**
   * Legacy API: called when a block is popped from the stack.
   * Superseded by onUnmount. Retained for backward-compatible mock behaviors.
   */
  onPop?(block: any, clock: any): IRuntimeAction[];
}
