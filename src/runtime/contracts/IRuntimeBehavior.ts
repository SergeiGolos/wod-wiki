import { IEvent } from "./events/IEvent";
import { IRuntimeAction } from "./IRuntimeAction";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IRuntimeClock } from "./IRuntimeClock";

/**
 * Generic, composable behavior contract applied to runtime blocks.
 *
 * Design goals:
 * - Constructor-configurable: concrete behaviors can accept arbitrary args in their constructors
 *   to control how they apply (targets, filters, thresholds, etc.).
 * - Application-time context: every hook receives both the script runtime and the specific block
 *   instance being acted upon.
 * - Optional hooks: implement only what you need; unimplemented hooks are skipped.
 * - Explicit ordering: behaviors specify their execution priority to avoid order-dependent bugs.
 */

export interface IRuntimeBehavior {
  /**
   * Execution priority (lower = earlier).
   * Default: 1000 (post-execution/neutral)
   * 
   * Priority Ranges:
   * - 0-99: Infrastructure (event routing, logging, debugging)
   * - 100-499: Pre-execution (timers, state setup, memory allocation)
   * - 500-999: Core logic (child runners, loops, business logic)
   * - 1000-1499: Post-execution (tracking, display, telemetry)
   * - 1500+: Cleanup (disposal, memory release, finalization)
   * 
   * Use constants from BehaviorPriority.ts for consistency.
   * 
   * @see BehaviorPriority.ts for predefined constants
   * @see https://github.com/SergeiGolos/wod-wiki/blob/main/docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md#75-medium-priority-explicit-behavior-ordering
   */
  readonly priority?: number;

  /** Called when the owning block is pushed onto the stack. May return initial events to emit. */
  onPush?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];

  /** Called when determining the next block after a child completes. Return a block to override. */
  onNext?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];

  /** Called right before the owning block is popped from the stack. */
  onPop?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];

  /** Called when the block is being disposed. Use this to clean up resources or log final metrics. */
  onDispose?(block: IRuntimeBlock): void;

  /** Called when an event is dispatched to the block. */
  onEvent?(event: IEvent, block: IRuntimeBlock): IRuntimeAction[];
}
