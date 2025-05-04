import { IRuntimeBlock, StatementNode } from "../timer.types";

/**
 * Type definitions for traversal callback functions
 */
type BlockTraversalCallback<T> = (block: IRuntimeBlock) => T | undefined;
type StatementTraversalCallback<T> = (node: StatementNode) => T | undefined;
type StackTraversalCondition = (block: IRuntimeBlock, result: any) => boolean;

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
    
    // Use the traverseParentChain method to build the blockKey
    const keyParts: string[] = [];
    this.traverseAll(
      (currentBlock) => {
        keyParts.unshift(`${currentBlock.blockId}:${currentBlock.index}`);
        return undefined; // Continue traversal
      }
    );
    
    block.blockKey = keyParts.join('|');
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
  
  /**
   * Traverses the current stack from the top down until a condition is met
   * @param callback Function to call for each block's statement
   * @returns The first non-undefined result from the callback
   */
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
  
  /**
   * Legacy method maintained for backward compatibility
   * Traverses the stack and applies a function to each statement node until a result is found
   */
  public fromStack<T>(
    blockFn: StatementTraversalCallback<T>
  ): T | undefined {
    return this.traverseFirst<T>(
      (block) => block.source ? blockFn(block.source) : undefined
    );
  }

  /**
   * Legacy method maintained for backward compatibility
   * Traverses the entire stack and applies a function to each statement node
   */
  public inStack(
    blockFn: StatementTraversalCallback<void>
  ): void {
    this.traverseFirst<void>(
      (block) => block.source ? blockFn(block.source) : undefined
    );
  }

  public popUntil(
    condition: StackTraversalCondition,
    startBlock?: IRuntimeBlock
  ): IRuntimeBlock | undefined {
    let currentBlock = startBlock || this.current();    
    condition = condition ?? (() => true);
    
    while (currentBlock) {      
      if (condition(currentBlock, currentBlock)) {
        return currentBlock;
      }       
      currentBlock = currentBlock.parent;
    }
    
    return undefined;
  }
}
