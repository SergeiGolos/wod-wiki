import { IRuntimeBlock, StatementNode } from "../timer.types";
import { RootBlock } from "./blocks/RootBlock";

/**
 * Manages the runtime trace of statement execution
 * Tracks the execution flow and state of each statement node
 */
export class RuntimeTrace {
  public stack: Array<IRuntimeBlock> = [];
  
  /**
   * Gets traces for nodes in the stack
 * @param stack Array of statement nodes to find traces for
 * @returns Array of matching statement traces
   */
  current(): IRuntimeBlock | undefined {
    return this.stack.length == 0
      ? undefined
      : this.stack[this.stack.length - 1];
  }

  /**
   * Records a new execution of the statement stack and returns a key
   * @param stack Array of statement nodes being executed
   * @returns A unique key for this execution context
   */
  push(block: IRuntimeBlock): IRuntimeBlock {
    this.stack.push(block);
    return block;
  }

  pop(): IRuntimeBlock | undefined {
    this.stack.pop();
    return this.current();
  }
}
