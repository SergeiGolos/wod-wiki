import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { CompleteStatementAction } from "../actions/IdleStatementAction";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";

export class EndHandler extends EventHandler {
  protected eventType: string = "end";

  protected handleEvent(
    event: IRuntimeEvent,
    _runtime: ITimerRuntime
  ): IRuntimeAction[] {
    // Create a result block for the final time
    return [
      new StopTimerAction({ name: "stop", timestamp: event.timestamp }),
      new CompleteStatementAction(),
      new SetButtonAction(event, []),
    ];
  }
}
