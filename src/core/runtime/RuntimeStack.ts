import { BlockKey } from "../BlockKey";
import { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * Type definitions for traversal callback functions
 */
type BlockTraversalCallback<T> = (block: IRuntimeBlock) => T | undefined;
type StackTraversalCondition = (block: IRuntimeBlock, result: any) => boolean;

/**
 * Manages the runtime trace of statement execution
 * Tracks the execution flow and state of each statement node
 */
export class RuntimeStack {  
  public stack: Array<IRuntimeBlock> = [];
  
  /**
   * Gets the current block in the stack
   * @returns The current block, or undefined if the stack is empty
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
    block.parent = this.current();        
    this.stack.push(block);    
    return block;
  }
  
  public pop(): IRuntimeBlock | undefined {
    if (this.stack.length == 0) {
      return undefined;
    }
    
    return this.stack.pop();
  }
  
  /**
   * Traverses up the parent chain from a starting block until a condition is met
   * @param startBlock The block to start traversal from
   * @param callback Function to call for each block in the chain
   * @param condition Optional condition to stop traversal
   * @returns The result from the callback if a non-undefined value is returned
   */
  public traverseAll<T>(
    callback: BlockTraversalCallback<T>,
    condition?: StackTraversalCondition,
    startBlock?: IRuntimeBlock
  ): T[] {
    let currentBlock = startBlock || this.current();
    let result: T[] = []
    condition = condition ?? (() => true);
    
    while (currentBlock) {
      var value = callback(currentBlock);
      if (value !== undefined) {
        result.push(value);
      }
      currentBlock = currentBlock.parent;
    }
    
    return result;
  }

  public traverseFirst<T>(
    callback: BlockTraversalCallback<T>,
    condition?: StackTraversalCondition,
    startBlock?: IRuntimeBlock    
  ): T | undefined {
    var results = this.traverseAll(
      callback,
      condition,
      startBlock
    );
    if (results.length == 0) {
      return undefined;
    }
    return results[0];
  }      
}
