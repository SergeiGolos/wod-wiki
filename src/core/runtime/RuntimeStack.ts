import { IRuntimeBlock, IRuntimeEvent, IRuntimeLog } from "../timer.types";
import { getDuration } from "./blocks/readers/getDuration";

/**
 * Manages the runtime trace of statement execution
 * Tracks the execution flow and state of each statement node
 */
export class RuntimeStack {  
  private stack: Array<IRuntimeBlock> = [];
  /**
   * Gets traces for nodes in the stack
   * @param stack Array of statement nodes to find traces for
   * @returns Array of matching statement traces
   */
  public current(): IRuntimeBlock | undefined {
    return this.stack.length == 0
      ? undefined
      : this.stack[this.stack.length - 1];
  }  

  /**
   * Records a new execution of the statement stack and returns a key
   * @param stack Array of statement nodes being executed
   * @returns A unique key for this execution context
   */
  public push(block: IRuntimeBlock): IRuntimeBlock {        
    this.stack.push(block);            
    const duration = this.fromStack(getDuration);
    block.duration = duration;
    return block;
  }
  
  public pop(): IRuntimeBlock | undefined {
    if (this.stack.length == 0) {
      return undefined;
    }

    return this.stack.pop();
  }
  public fromStack<T>(
    blockFn: (block: IRuntimeBlock) => T | undefined
  ): T | undefined {
    let current = this.current();
    let outcome: T | undefined = undefined;
    do {
      outcome = blockFn(current!);
      current = current?.parent;
    } while (!outcome && current);
    return outcome;
  }

  public inStack(
    blockFn: (block: IRuntimeBlock) => void | undefined
  ): void {
    let current = this.current();
    do {
      blockFn(current!);
      current = current?.parent;
    } while (current);
  }  
}
