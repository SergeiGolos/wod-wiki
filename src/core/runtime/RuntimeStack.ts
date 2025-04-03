
import { StatementNode } from "../timer.types";

export class RuntimeStack {
  private lookupIndex: { [key: number]: number; } = {};
  public trace: string[] = [];
  public leafs: StatementNode[] = [];

  /**
   * Creates a new CompiledRuntime instance
   * @param nodes Array of statement nodes from the parser
   * @param jit RuntimeJit instance for just-in-time compilation
   */
  constructor(private nodes: StatementNode[]) {
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
  public getId(id: number): StatementNode | undefined {
    const index = this.lookupIndex[id];
    if (index === undefined) {
      return undefined;
    }

    return this.nodes[index];
  }

  /**
   * Navigates to a specific block in the workout script
   * @param blockId ID of the block to navigate to
   * @returns StatementNode representing the execution state of the specified block
   * @throws Error if the block is not a leaf node
   */
  public goto(blockId: number): StatementNode[] {            
    // Check if this is a leaf node (executable block)
    const isLeaf = this.leafs.some(leaf => leaf.id === blockId);    
    if (!isLeaf) {
      throw new Error(`Block with ID ${blockId} is not a leaf node and cannot be executed directly`);
    }
    const stack : StatementNode[] = [];        
    let node: StatementNode | undefined = this.getId(blockId)    
    while (node !== undefined) {
      stack.push(node);      
      if (node.parent === undefined) {
        node = undefined;
        continue;
      }

      node = this.getId(node.parent);
    }

    return stack;
  }
}
