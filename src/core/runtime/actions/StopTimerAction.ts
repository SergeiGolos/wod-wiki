import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { BubbleUpAction } from "./base/BubbleUpAction";
import { getDuration } from "../blocks/readers/getDuration";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetResultSpanAction } from "../outputs/SetResultSpanAction";
import { ResultSpan } from "@/core/ResultSpan";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { ITimeSpan } from "@/core/ITimeSpan";

/**
 * Action that stops a timer and propagates up the block hierarchy
 */
export class StopTimerAction extends BubbleUpAction {
  constructor(private event: IRuntimeEvent) {
    super();
  }

  name: string = "stop";

  /**
   * Apply the stop timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    console.log(`+=== stop_timer : ${block.blockKey}`);
    
    // Call the block's onStop method to handle the timer stop
    const actions = block.onStop(runtime);
    
    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }
    
    // Get the current RuntimeSpan for the block
    let currentRuntimeSpan: RuntimeSpan | undefined;
    const spans = block.spans();
    if (spans.length > 0) {
      currentRuntimeSpan = spans[spans.length - 1];
      
      // Find the last TimeSpan that was started
      const timeSpans = currentRuntimeSpan.timeSpans;
      if (timeSpans.length > 0) {
        const lastTimeSpan = timeSpans[timeSpans.length - 1];
        
        // If the last TimeSpan is still running (no stop time), stop it
        if (lastTimeSpan.start && !lastTimeSpan.stop) {
          lastTimeSpan.stop = this.event;
          
          // Create a ResultSpan from the updated RuntimeSpan
          const resultSpan = new ResultSpan(currentRuntimeSpan);
          
          // Push the ResultSpan to update the primary clock
          runtime.apply([new SetResultSpanAction(resultSpan, "primary")], block);
          
          // Also update any registry if applicable
          if (runtime.registry) {
            runtime.registry.registerSpan(resultSpan);
          }
          
          return; // We've handled the update with the ResultSpan
        }
      }
    }
    
    // Fallback to traditional clock update if we couldn't use ResultSpan
    const duration = block.selectMany(getDuration)[0];
    if (duration !== undefined) {
      runtime.apply([new SetClockAction("primary")], block);
    }
  }
}
