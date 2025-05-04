import { IRuntimeBlock, IRuntimeEvent, IRuntimeLog, StatementNode } from "../timer.types";
import { getDuration } from "./blocks/readers/getDuration";

/**
 * Manages the runtime trace of statement execution
 * Tracks the execution flow and state of each statement node
 */
export class RuntimeStack {  
  public stack: Array<IRuntimeBlock> = [];
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
    
    // Build the blockKey by walking up the parent chain
    // Format: blockId1:index1|blockId2:index2|...|blockIdN:indexN
    let keyParts: string[] = [];
    let currentBlock: IRuntimeBlock | undefined = block;
    
    while (currentBlock) {
      keyParts.unshift(`${currentBlock.blockId}:${currentBlock.index}`);
      currentBlock = currentBlock.parent;
    }
    
    block.blockKey = keyParts.join('|');
    return block;
  }
  
  public pop(): IRuntimeBlock | undefined {
    if (this.stack.length == 0) {
      return undefined;
    }

    return this.stack.pop();
  }
  public fromStack<T>(
    blockFn: (node: StatementNode) => T | undefined
  ): T | undefined {
    let current = this.current();
    let outcome: T | undefined = undefined;
    do {
      outcome = blockFn(current!.source!);
      current = current?.parent;
    } while (!outcome && current);
    return outcome;
  }

  public inStack(
    blockFn: (node: StatementNode) => void | undefined
  ): void {
    let current = this.current();
    do {
      blockFn(current!.source!);
      current = current?.parent;
    } while (current);
  }  
}
