import { JitStatement } from "../JitStatement";
import { ICodeStatement } from "../CodeStatement";

export class RuntimeScript {
  public root: JitStatement[] = [];
  private lookupIndex: { [key: number]: number; } = {};
  constructor(public nodes: ICodeStatement[]) {
    // Initialize the lookup index
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.meta.columnStart == 1){
        this.root.push(new JitStatement(node));
      }
      // Store the node index in our lookup table by ID for quick access
      this.lookupIndex[node.id] = i;
    }
  }  

  /**
   * Gets the index of a node by its ID
   * @param id ID of the node to look up
   * @returns The index of the node, or undefined if not found
   */
  public getId(id: number): JitStatement[] {
    const stack: JitStatement[] = [];
    let index: number | undefined   = this.lookupIndex[id];    
    
    while (index !== undefined) {
      const node : JitStatement = new JitStatement(this.nodes[index]);      
      stack.push(node);
      index = node.parent ? this.lookupIndex[node.parent] : undefined;
    }

    return stack;
  }    
}
