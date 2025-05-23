import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { AbstractRuntimeAction } from "./AbstractRuntimeAction";

/**
 * Base class for actions that operate only on the current block in the runtime trace.
 * These are "leaf node" actions that don't propagate up the block hierarchy.
 */
export abstract class LeafNodeAction extends AbstractRuntimeAction {
  /**
   * Implements the application strategy by getting the current block
   * from the runtime trace and applying the action to it.
   */
  protected applyImplementation(runtime: ITimerRuntime): void {
    const currentBlock = runtime.trace.current();
    if (currentBlock) {
      this.applyBlock(runtime, currentBlock);
    } else {
      console.warn(`LeafNodeAction ${this.name}: No current block found to apply action to`);
    }
  }

  /**
   * Subclasses must implement this method to define how the action
   * should be applied to the current block.
   */
  protected abstract applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void;
}