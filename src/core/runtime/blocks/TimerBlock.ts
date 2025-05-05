import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeBlock, StatementNodeDetail, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { PopBlockAction } from "../actions/PopBlockAction";
import { EventHandler } from "../EventHandler";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class TimerBlock extends RuntimeBlock implements IRuntimeBlock {
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
      new SetClockAction("primary"),
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
      new SetClockAction("primary"),
      new SetButtonsAction([], "runtime")
    ];
  }
}
