import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { BubbleUpAction } from "./base/BubbleUpAction";

/**
 * Action that navigates to the end state of the workout and propagates up the block hierarchy
 */
export class GotoEndAction extends BubbleUpAction {
  name: string = "End";

  /**
   * Apply the goto end action to a specific block
   * This clears the stack first and then creates an end block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    // No need to apply to each block since we're going to clear the stack anyway
    // We only want to process the first block this is called on
    
    // If this is the first block (typically the current block), clear the stack
    if (block === runtime.trace.current()) {
      while (runtime.trace.stack.length > 0) {
        runtime.pop();
      }
      
      // Push the end block onto the stack
      runtime.push(runtime.jit.end(runtime));
    }
  }
}
