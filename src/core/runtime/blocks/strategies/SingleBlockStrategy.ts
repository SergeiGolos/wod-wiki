import { IRuntimeBlock, ITimerRuntime, StatementNodeDetail } from "../../../timer.types";
import { SingleBlock } from "../SingleBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */
export class SingleBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    return node.rounds === 1 && node.children?.length === 0;
  }

  compile(
    node: StatementNodeDetail, 
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {    

    return new SingleBlock(node);
  }
}
