import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { BubbleUpAction } from "./base/BubbleUpAction";

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
    // Call the block's onStart method to handle the timer start
    const actions = block.onStart(runtime);
    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }
  }
}
