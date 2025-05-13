import { completeButton } from "@/components/buttons/timerButtons";
import { ITimerRuntime, IRuntimeAction, PrecompiledNode } from "@/core/timer.types";
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

export class TimerBlock extends RuntimeBlock {
  constructor(
    sources: PrecompiledNode[],
    handlers: EventHandler[] = []
  ) {
    super(sources);
    this.handlers = [...handlers, new CompleteHandler()];
    this.ctx.index = 1;
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetClockAction("primary"),
      new SetButtonsAction([completeButton], "runtime")
    ];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new PopBlockAction()
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetClockAction("primary"),
      new SetButtonsAction([], "runtime")
    ];
  }
}
