import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { IRuntimeAction } from "@/core/IRuntimeAction";

/**
 * Action that starts a timer and propagates up the block hierarchy
 */
export class StartTimerAction implements IRuntimeAction {
  constructor(public event: IRuntimeEvent) {
   
  }
  
  name: string = "start";
  
  /**
   * Apply the start timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected apply(runtime: ITimerRuntime): void {
    const block: IRuntimeBlock = runtime.trace.current()!;
    console.log(`StartTimerAction executed for block: ${block.blockKey}, event: ${this.event.name} at ${this.event.timestamp}`);
    const actions  = block.onStart(runtime);

    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }      
  }
}
