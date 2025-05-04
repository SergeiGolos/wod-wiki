import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { ResetAction } from "../actions/ResetAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { startButton } from "@/components/buttons/timerButtons";
import { SetClockAction } from "../outputs/SetClockAction";
import { getDuration } from "../blocks/readers/getDuration";
import { IdleStatementAction } from "../actions/IdleStatementAction";

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
      new SetButtonsAction([startButton], "system"),
      new SetClockAction("primary")      
    ];
  }
}
