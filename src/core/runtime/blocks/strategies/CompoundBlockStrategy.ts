import { IRuntimeBlock, ITimerRuntime, StatementNodeDetail } from "../../../timer.types";
import { CompoundBlock } from "../CompoundBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";


/**
 * Strategy for creating CompoundBlock runtime blocks
 * Handles statements with children that are not repeating blocks
 */
export class CompoundBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    // A compound block has children but no repetition count > 1
    return (node.children && node.children.length > 0) && 
           node.rounds != null && node.rounds <= 1;
  }

  compile(
    node: StatementNodeDetail, 
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {        
    // TODO: Handle group operators (+/-) if needed
    // The groupType property might be added to the StatementNode in the future
    return new CompoundBlock(node);  
  }
}
