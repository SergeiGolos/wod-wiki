import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeBlock, StatementNodeDetail, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { CompleteLapHandler } from "../inputs/CompleteEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { RuntimeBlock } from "./RuntimeBlock";


export class TimedGroupBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(source: StatementNodeDetail) {
    super(source);
    this.handlers.push(new CompleteLapHandler());
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetClockAction("primary"),
      new SetButtonsAction([completeButton], "runtime")
    ];
  }
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
