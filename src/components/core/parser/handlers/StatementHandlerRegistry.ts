import { IRuntimeBlock } from "../../runtime/timer.runtime";
import { StatementNode } from "../../timer.types";
import { IStatementHandler } from "./StatementHandler";

/**
 * Registry for statement handlers that processes nodes through registered handlers
 * 
 * This class is responsible for:
 * - Storing and organizing statement handlers
 * - Processing nodes by applying appropriate handlers
 * - Walking up the parent stack to apply handlers to all levels
 * 
 * Following Single Responsibility Principle, this class handles only the 
 * coordination of statement handlers and their application to nodes.
 */
export class StatementHandlerRegistry {
  private handlers: IStatementHandler[] = [];

  /**
   * Creates a new StatementHandlerRegistry
   * @param handlers Array of statement handlers to register
   */
  constructor(handlers: IStatementHandler[] = []) {
    this.handlers = [...handlers];
  }

  /**
   * Registers a new statement handler
   * @param handler The handler to register
   */
  public register(handler: IStatementHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Processes a node through all registered handlers
   * @param runtimeBlock The runtime block being processed
   * @param node The statement node to process
   * @returns The updated runtime block after all handlers have been applied
   */
  public process(runtimeBlock: IRuntimeBlock, node: StatementNode): IRuntimeBlock {
    // Start with the current block
    let currentBlock = runtimeBlock;
    
    // Process the node with each handler
    for (const handler of this.handlers) {
      currentBlock = handler.build(currentBlock, node);
    }
    
    return currentBlock;
  }

  /**
   * Processes a node and all its parents through registered handlers
   * @param runtimeBlock The runtime block being processed
   * @param node The statement node to process
   * @param getParentNode Function to retrieve a parent node by ID
   * @returns The updated runtime block after all handlers have been applied
   */
  public processWithParents(
    runtimeBlock: IRuntimeBlock, 
    node: StatementNode,
    getParentNode: (id: number) => StatementNode | undefined
  ): IRuntimeBlock {
    // Start with the current node and block
    let currentNode = node;
    let currentBlock = runtimeBlock;
    
    // Process the current node
    currentBlock = this.process(currentBlock, currentNode);
    
    // Walk up the parent stack
    while (currentNode.parent !== undefined) {
      // Get the parent node
      const parentNode = getParentNode(currentNode.parent);
      if (!parentNode) {
        break;
      }
      
      // Process the parent node
      currentBlock = this.process(currentBlock, parentNode);
      
      // Move up to the next parent
      currentNode = parentNode;
    }
    
    return currentBlock;
  }
  
  /**
   * Gets the number of registered handlers
   * @returns The number of handlers
   */
  public getHandlerCount(): number {
    return this.handlers.length;
  }
}
