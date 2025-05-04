import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RepeatingBlock } from "../RepeatingBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";


export class RepeatingBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    return (node?.rounds != null) && node.rounds > 1;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RepeatingBlock(node);
  }
}
