import { StatementNodeDetail, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class TimedRepeaterBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    if (node.duration?.sign === "-"
      && (node?.rounds != null
        && node.rounds === 1)) {
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new TimedGroupBlock(node);
  }
}
