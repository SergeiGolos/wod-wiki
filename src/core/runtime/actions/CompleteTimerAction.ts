import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { LeafNodeAction } from "./base/LeafNodeAction";
import { StopEvent } from "../inputs/StopEvent";
import { StopTimerAction } from "./StopTimerAction";

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
    // First, stop the timer properly before completing
    const stopEvent = new StopEvent(new Date());
    const stopAction = new StopTimerAction(stopEvent);
    
    // Apply the stop timer action to close the current timespan
    stopAction.apply(runtime, block);
    
    // Then pop the block from the runtime
    runtime.pop();
  }
}