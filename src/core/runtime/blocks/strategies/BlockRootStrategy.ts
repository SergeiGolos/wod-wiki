import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/types/RuntimeMetric";
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
    _compiledMetrics: RuntimeMetric[],
    _legacySources: JitStatement[],
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // For root block, we ignore the compiled metrics and use the script's root
    return new RootBlock(runtime.script.root);
  }
}
