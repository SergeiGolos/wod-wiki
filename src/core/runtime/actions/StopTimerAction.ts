import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { Subject } from "rxjs";

/**
 * Action that stops a timer and propagates up the block hierarchy
 */
export class StopTimerAction implements IRuntimeAction {
  constructor(public event: IRuntimeEvent) {
  
  }
  apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void {
    const block = runtime.trace.current()!;
    // Call the block's onStop method to handle the timer stop
    console.log(`StopTimerAction executed for block: ${block.blockKey}, event: ${this.event.name} at ${this.event.timestamp}`);   
    const actions = block.onStop(runtime);
    
    // Apply any additional actions that the block may have generated
    if (actions.length > 0) {
      runtime.apply(actions, block);
    }      
  }

  name: string = "stop";

  /**
   * Apply the stop timer action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    
  }
}
