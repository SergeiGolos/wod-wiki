import { StatementNodeDetail, RootStatementNode, IRuntimeBlock, ITimerRuntime } from "../../../timer.types";
import { RootBlock } from "../RootBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class RootBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    return node instanceof RootStatementNode;
  }

  compile(
    _node: StatementNodeDetail,
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RootBlock(runtime.script.root);
  }
}
