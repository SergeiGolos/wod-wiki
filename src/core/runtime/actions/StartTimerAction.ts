import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { BubbleUpAction } from "./base/BubbleUpAction";
import { SetResultSpanAction } from "../outputs/SetResultSpanAction";
import { ResultSpan } from "@/core/ResultSpan";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { ITimeSpan } from "@/core/ITimeSpan";

/**
 * Action that starts a timer and propagates up the block hierarchy
 */
export class StartTimerAction extends BubbleUpAction {
  constructor(private event: IRuntimeEvent) {
    super();
  }
  
  name: string = "start";
  
  /**
   * Apply the start timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    console.log(`StartTimerAction executed for block: ${block.blockKey}, event: ${this.event.name} at ${this.event.timestamp}`);
    
    // Get or create a RuntimeSpan for this block
    let currentRuntimeSpan: RuntimeSpan | undefined;
    const spans = block.spans();
    
    if (spans.length > 0) {
      currentRuntimeSpan = spans[spans.length - 1];
      
      // Check if there's already a TimeSpan in progress
      const timeSpans = currentRuntimeSpan.timeSpans;
      let lastTimeSpan: ITimeSpan | undefined;
      
      if (timeSpans.length > 0) {
        lastTimeSpan = timeSpans[timeSpans.length - 1];
        
        // If the last TimeSpan is running (has start but no stop), stop it
        if (lastTimeSpan.start && !lastTimeSpan.stop) {
          lastTimeSpan.stop = this.event;
          
          // Create a new TimeSpan and add it to the RuntimeSpan
          const newTimeSpan: ITimeSpan = { start: this.event };
          timeSpans.push(newTimeSpan);
        } else {
          // The last TimeSpan is complete, create a new one
          const newTimeSpan: ITimeSpan = { start: this.event };
          timeSpans.push(newTimeSpan);
        }
      } else {
        // No TimeSpans exist yet, create the first one
        const newTimeSpan: ITimeSpan = { start: this.event };
        timeSpans.push(newTimeSpan);
      }
    } else {
      // No RuntimeSpan exists yet, create one
      currentRuntimeSpan = new RuntimeSpan();
      currentRuntimeSpan.blockKey = block.blockKey;
      currentRuntimeSpan.timeSpans = [{ start: this.event }];
      
      // Add the RuntimeSpan to the block
      if (typeof block.addSpan === 'function') {
        block.addSpan(currentRuntimeSpan);
      }
    }
    
    // Create a ResultSpan from the RuntimeSpan and update the primary clock
    if (currentRuntimeSpan) {
      const resultSpan = new ResultSpan(currentRuntimeSpan);
      runtime.apply([new SetResultSpanAction(resultSpan, "primary")], block);
      
      // Register the ResultSpan in the registry if available
      if (runtime.registry) {
        runtime.registry.registerSpan(resultSpan);
      }
    }
    
    // Call the block's onStart method to handle the timer start
    const actions = block.onStart(runtime);
    
    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }
  }
}
