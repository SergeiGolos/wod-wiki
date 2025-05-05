import { IRuntimeBlock, ITimerRuntime, IRuntimeAction, StatementNodeDetail } from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { completeButton } from "@/components/buttons/timerButtons";
import { CompleteLapHandler } from "../inputs/CompleteEvent";

export class TimedRepeaterBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(source: StatementNodeDetail) {
    super(source);
    this.handlers.push(new CompleteLapHandler())
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
