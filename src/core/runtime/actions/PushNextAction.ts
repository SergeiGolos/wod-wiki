import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeAction } from "@/core/IRuntimeAction";

/**
 * Action that pushes the next action for the current block
 */
export class PushNextAction implements IRuntimeAction {
  name: string = "next";

  /**
   * Apply the next action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */ 
  apply(runtime: ITimerRuntime): void {
    const block = runtime.trace.current()!;
    console.log(`🔄 PushNextAction.applyBlock() - calling next() on ${block.constructor.name} [${block.blockKey}]`);
    
    const next = block.next(runtime);
    
    console.log(`🔄 PushNextAction.applyBlock() - block.next() returned ${next.length} actions:`, next.map(a => a.name));
    
    runtime.apply(next, block);
  }
}
