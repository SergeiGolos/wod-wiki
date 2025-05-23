import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { LeafNodeAction } from "./base/LeafNodeAction";

/**
 * Action that completes a timer for the current block
 */
export class CompleteTimerAction extends LeafNodeAction {
  name: string = "complete";

  /**
   * Apply the complete timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    // When completing a timer, we pop the current block
    // This is the current behavior, but could be enhanced to record completion time
    runtime.pop();
  }
}