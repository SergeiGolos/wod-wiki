import { StatementNodeDetail, RootStatementNode, IRuntimeBlock, ITimerRuntime } from "../../../timer.types";
import { IdleRuntimeBlock } from "../IdleRuntimeBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class IdleBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    return node instanceof RootStatementNode;
  }

  compile(
    _node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new IdleRuntimeBlock();
  }
}
