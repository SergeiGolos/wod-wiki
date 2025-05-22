import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { AbstractRuntimeAction } from "./AbstractRuntimeAction";

/**
 * Base class for actions that need to bubble up through the block hierarchy.
 * The action is first applied to the current block and then propagates up to all parent blocks.
 */
export abstract class BubbleUpAction extends AbstractRuntimeAction {
  /**
   * Implements the bubble-up strategy by starting with the current block
   * and then moving up through all parent blocks in the hierarchy.
   */
  protected applyImplementation(runtime: ITimerRuntime): void {
    let currentBlock = runtime.trace.current();
    
    // Apply to the current block and then bubble up through all parents
    while (currentBlock) {
      this.applyBlock(runtime, currentBlock);
      currentBlock = currentBlock.parent;
    }
  }

  /**
   * Subclasses must implement this method to define how the action
   * should be applied to each block in the hierarchy.
   */
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;
}