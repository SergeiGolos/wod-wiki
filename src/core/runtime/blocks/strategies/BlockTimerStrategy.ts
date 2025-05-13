import { IRuntimeBlock, ITimerRuntime, PrecompiledNode } from "../../../timer.types";
import { TimerBlock } from "../TimerBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    const rounds = node.rounds();
    return rounds != null && rounds === 1 && node.children?.length === 0;
  }

  compile(
    nodes: PrecompiledNode[], 
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {    
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('TimerBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    return new TimerBlock(nodes);
  }
}
