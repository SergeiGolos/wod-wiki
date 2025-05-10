import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RepeatingGroupBlock } from "../RepeatingGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class RepeatingBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    if (node?.rounds != null && node.rounds > 1) {
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RepeatingGroupBlock(node);
  }
}

export class RepeatingCompoundBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    if (node?.rounds != null && node.rounds > 1) {
     
      // todo look at children? 
      
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RepeatingGroupBlock(node);
  }
}
