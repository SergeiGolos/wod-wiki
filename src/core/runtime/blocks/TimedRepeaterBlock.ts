import { IRuntimeBlock, ITimerRuntime, IRuntimeAction, StatementNodeDetail } from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

// TODO: Implement


export class TimedRepeaterBlock extends RuntimeBlock implements IRuntimeBlock {
  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    throw new Error("Method not implemented.");
  }
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    throw new Error("Method not implemented.");
  }
  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    throw new Error("Method not implemented.");
  }
  constructor(source: StatementNodeDetail) {
    super(source);
  }
}
