import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { LeafNodeAction } from "./base/LeafNodeAction";

/**
 * Action that pushes the next action for the current block
 */
export class PushNextAction extends LeafNodeAction {
  name: string = "next";

  /**
   * Apply the next action to a specific block
   * 
   * @param runtime The timer runtime
   * @param block The block to apply the action to
   */
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    const next = block.next(runtime);
    runtime.apply(next, block);
  }
}
