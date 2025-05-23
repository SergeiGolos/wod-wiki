import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { LeafNodeAction } from "./base/LeafNodeAction";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { ResultSpan } from "@/core/ResultSpan";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { SetResultSpanAction } from "../outputs/SetResultSpanAction";

/**
 * Action that completes a timer for the current block
 */
export class CompleteTimerAction extends LeafNodeAction {
  name: string = "complete";
  
  constructor(private event?: IRuntimeEvent) {
    super();
  }

  /**
   * Apply the complete timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    // Close any open TimeSpans before popping the block
    let currentRuntimeSpan: RuntimeSpan | undefined;
    const spans = block.spans();
    
    if (spans.length > 0) {
      currentRuntimeSpan = spans[spans.length - 1];
      
      // Find the last TimeSpan that was started
      const timeSpans = currentRuntimeSpan.timeSpans;
      if (timeSpans.length > 0) {
        const lastTimeSpan = timeSpans[timeSpans.length - 1];
        
        // If the last TimeSpan is still running (no stop time), stop it
        if (lastTimeSpan.start && !lastTimeSpan.stop && this.event) {
          lastTimeSpan.stop = this.event;
          
          // Create a ResultSpan from the updated RuntimeSpan
          const resultSpan = new ResultSpan(currentRuntimeSpan);
          
          // Update the registry if applicable
          if (runtime.registry) {
            runtime.registry.registerSpan(resultSpan);
          }
        }
      }
    }
    
    // Now pop the current block
    runtime.pop();
  }
}