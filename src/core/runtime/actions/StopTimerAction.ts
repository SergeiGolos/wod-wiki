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
    console.log(`StartTimerAction executed for block: ${block.blockKey}, event: ${this.event.name} at ${this.event.timestamp}`);
    
    // Call the block's onStop method to handle the timer stop
    const actions = block.onStop(runtime);
    
    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }      
  }
}
