import { PrecompiledNode, IRuntimeBlock, ITimerRuntime } from "../../../timer.types";
import { RootBlock } from "../RootBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class BlockRootStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    // Check if the single node has no parent (root node)
    return nodes[0].parent === undefined;
  }

  compile(
    _nodes: PrecompiledNode[],
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // For root block, we ignore the nodes array and use the script's root
    return new RootBlock(runtime.script.root);
  }
}
