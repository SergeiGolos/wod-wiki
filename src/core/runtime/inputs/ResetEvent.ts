import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { ResetAction } from "../actions/ResetAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { startButton } from "@/components/buttons/timerButtons";
import { SetClockAction } from "../outputs/SetClockAction";
import { GoToStatementAction } from "../actions/GoToStatementAction";

export class ResetEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'reset';
}

export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {        
    return [
      new ResetAction(event),      
      new GoToStatementAction(undefined),      
      new SetButtonsAction([startButton], "system"),
      new SetClockAction(_runtime.trace.current()!, "primary"),
    ];
  }
}
