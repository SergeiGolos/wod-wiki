import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RootBlock } from "../RootBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class BlockRootStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    // Check if the single node has no parent (root node)
    return nodes[0].parent === undefined;
  }

  compile(
    _nodes: JitStatement[],
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // For root block, we ignore the nodes array and use the script's root
    return new RootBlock(runtime.script.root);
  }
}
