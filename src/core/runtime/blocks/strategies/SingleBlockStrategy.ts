import { IRuntimeBlock, ITimerRuntime, StatementNodeDetail } from "../../../timer.types";
import { TimerBlock } from "../TimerBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";



/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */
export class TimerBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: StatementNodeDetail[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    return node.rounds === 1 && node.children?.length === 0;
  }

  compile(
    nodes: StatementNodeDetail[], 
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {    
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('TimerBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Use the first (and only) node for compatibility with existing implementation
    return new TimerBlock(nodes[0]);
  }
}
