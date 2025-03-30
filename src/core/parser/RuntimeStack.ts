
import { StatementNode, IRuntimeBlock } from "../timer.types";
import { RuntimeBlock } from "../runtime/blocks/RuntimeBlock";
import { IStatementHandler } from "./handlers/StatementHandler";
import { StatementHandlerRegistry } from "./handlers/StatementHandlerRegistry";

/**
 * Compiled runtime that manages workout statement nodes and their handlers
 *
 * This class is responsible for:
 * - Storing and indexing statement nodes
 * - Managing runtime handlers for each node
 * - Processing timer events and delegating to appropriate handlers
 */

export class RuntimeStack {
  private lookupIndex: { [key: number]: number; } = {};
  public leafs: StatementNode[] = [];
  private currentPointer: number = -1;
  private handlerRegistry: StatementHandlerRegistry;

  /**
   * Creates a new CompiledRuntime instance
   * @param nodes Array of statement nodes from the parser
   * @param handlers Array of statement handlers to use for processing nodes
   */
  constructor(nodes: StatementNode[], handlers: IStatementHandler[] = []) {
    this.handlerRegistry = new StatementHandlerRegistry(handlers);

    // Initialize the lookup index and identify leaf nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Store the node index in our lookup table by ID for quick access
      this.lookupIndex[node.id] = i;

      // If the node has no children, it's a leaf node to be executed
      if (node.children.length === 0) {
        this.leafs.push(node);
      }
    }
  }

  /**
   * Gets a statement node by its index
   * @param index Index of the node to get
   * @returns The statement node at the given index, or undefined if not found
   */
  public getIndex(index: number): StatementNode | undefined {
    if (index < 0 || index >= this.leafs.length) {
      return undefined;
    }

    return this.leafs[index];
  }

  /**
   * Gets the index of a node by its ID
   * @param id ID of the node to look up
   * @returns The index of the node, or undefined if not found
   */
  public getId(id: number): number | undefined {
    const index = this.lookupIndex[id];
    if (index === undefined) {
      return undefined;
    }

    return index;
  }

  /**
   * Navigates to a specific block in the workout script
   * @param blockId ID of the block to navigate to
   * @returns RuntimeBlock representing the execution state of the specified block
   * @throws Error if the block is not a leaf node
   */
  public goto(blockId: number): IRuntimeBlock {            
    // Check if this is a leaf node (executable block)
    const isLeaf = this.leafs.some(leaf => leaf.id === blockId);
    if (!isLeaf) {
      throw new Error(`Block with ID ${blockId} is not a leaf node and cannot be executed directly`);
    }

    // Initialize a new runtime block
    let block: IRuntimeBlock =new RuntimeBlock(
      blockId,
      this.getId(blockId) ?? -1,
      "",
      undefined,
      [0,0]);

    // Process the node through all statement handlers and apply them up the parent stack
    // block = this.handlerRegistry.processWithParents(
    //   block,
    // this.getIndex(this.getId(blockId) ?? -1)    ?? -1,
    //   (parentId) => this.getIndex(this.getId(parentId) ?? -1) ?? -1
    // );

    return block;
  }
}
