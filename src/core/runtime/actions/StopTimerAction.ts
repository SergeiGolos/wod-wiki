import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { BubbleUpAction } from "./base/BubbleUpAction";
import { getDuration } from "../blocks/readers/getDuration";
import { SetClockAction } from "../outputs/SetClockAction";
import { PushActionEvent } from "../inputs/PushActionEvent";

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
    
    // Check if we need to update the clock
    const duration = block.selectMany(getDuration)[0];
    if (duration !== undefined) {
      // Push the clock action to update the UI
      runtime.apply([new SetClockAction("primary")], block);
    }
  }
}
