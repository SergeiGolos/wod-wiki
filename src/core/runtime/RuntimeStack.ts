
import { StatementNode } from "../timer.types";

export class RuntimeStack {
  private lookupIndex: { [key: number]: number; } = {};
  public trace: string[] = [];
  

  /**
   * Creates a new CompiledRuntime instance
   * @param nodes Array of statement nodes from the parser
   * @param jit RuntimeJit instance for just-in-time compilation
   */
  constructor(public nodes: StatementNode[]) {
    // Initialize the lookup index
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Store the node index in our lookup table by ID for quick access
      this.lookupIndex[node.id] = i;
    }
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
   */
  public goto(blockId: number): StatementNode[] {            
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
