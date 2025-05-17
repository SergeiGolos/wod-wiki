import { IRuntimeBlock, ResultSpan } from "../timer.types";
import { ResultSpanRegistry } from "../metrics";

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
   * Registry for centralized management of ResultSpans
   */
  public readonly spanRegistry = new ResultSpanRegistry();
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
    block.parent = this.current();    
    this.stack.push(block);    
    // Use the traverseParentChain method to build the blockKey
    const keyParts: string[] = [];
    this.traverseAll(
      (currentBlock) => {
        keyParts.unshift(`${currentBlock.blockId}:${currentBlock.getIndex()}`);
        return undefined; // Continue traversal
      }
    );
    
    block.blockKey = keyParts.join('|');
    
    // Register parent-child relationship in existing spans if applicable
    if (block.parent) {
      const parentSpans = block.parent.getResultSpans();
      const parentKey = block.parent.blockKey;
      
      // If the parent has spans, add this block as a child to them
      if (parentKey && parentSpans && parentSpans.length > 0) {
        parentSpans.forEach(span => {
          if (!span.children.includes(block.blockKey || '')) {
            span.children.push(block.blockKey || '');
          }
        });
      }
    }
    
    return block;
  }
  
  public pop(): IRuntimeBlock | undefined {
    if (this.stack.length == 0) {
      return undefined;
    }
    
    const poppedBlock = this.stack.pop();
    
    // Register any spans from the popped block before it's gone
    if (poppedBlock) {
      const spans = poppedBlock.getResultSpans();
      spans.forEach(span => this.spanRegistry.registerSpan(span));
    }

    return poppedBlock;
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
  /**
   * Gets all result spans from all blocks in the stack
   * @returns Array of all ResultSpans
   */
  public getAllResultSpans(): ResultSpan[] {
    const allSpans: ResultSpan[] = [];
    
    // Collect spans from all blocks in the stack
    this.traverseAll(block => {
      const blockSpans = block.getResultSpans();
      blockSpans.forEach(span => {
        // Check if this span is already in our collection to avoid duplicates
        const existingIndex = allSpans.findIndex(s => 
          s.blockKey === span.blockKey && 
          s.index === span.index && 
          s.start?.timestamp.getTime() === span.start?.timestamp.getTime()
        );
        
        if (existingIndex < 0) {
          allSpans.push(span);
        }
      });
      
      return undefined; // Continue traversal
    });
    
    return allSpans;
  }
  
  /**
   * Gets result spans for a specific block key
   * @param blockKey The block key to get spans for
   * @returns Array of matching ResultSpans
   */
  public getResultSpansByBlockKey(blockKey: string): ResultSpan[] {
    return this.spanRegistry.getSpansByBlockKey(blockKey);
  }
  
  /**
   * Gets spans by time range
   * @param startTime Start of the time range
   * @param endTime End of the time range
   * @returns Array of matching ResultSpans
   */
  public getResultSpansByTimeRange(startTime: Date, endTime: Date): ResultSpan[] {
    return this.spanRegistry.getSpansByTimeRange(startTime, endTime);
  }
  
  /**
   * Aggregates metrics across all spans in the stack
   * @returns Aggregated metrics
   */
  public aggregateMetrics() {
    const allSpans = this.getAllResultSpans();
    return this.spanRegistry.aggregateMetrics(allSpans);
  }
  
  /**
   * Gets a hierarchical view of result spans
   * @param rootBlockKey Optional root block key to start from
   * @returns Hierarchical view of spans
   */
  public getHierarchicalSpans(rootBlockKey?: string) {
    // Make sure all spans are registered
    this.traverseAll(block => {
      this.spanRegistry.registerBlockSpans(block);
      return undefined;
    });
    
    return this.spanRegistry.createHierarchicalView(rootBlockKey);
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
