import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeBlock, StatementNodeDetail, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { StartEvent } from "../inputs/StartEvent";
import { StopEvent } from "../inputs/StopEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { RuntimeBlock } from "./RuntimeBlock";


export class EffortBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(
    source: StatementNodeDetail,
    public handlers: EventHandler[] = []
  ) {
    super(source);
    this.handlers = [...handlers, new CompleteHandler()];
    this.index = 1;
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime")
    ];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new PopBlockAction()
    ];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime")
    ];
  }
}
