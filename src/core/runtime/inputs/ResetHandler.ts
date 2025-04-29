import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { ResetAction } from "../actions/ResetAction";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { DisplayEvent } from "./DisplayEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { startButton } from "@/components/buttons/timerButtons";
import { SetClockAction } from "../outputs/SetClockAction";
import { GotoStatementAction } from "../actions/NextStatementAction";
export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {        
    return [
      new ResetAction(event),      
      new GotoStatementAction(undefined),      
      new SetButtonsAction([startButton], "system"),
      new SetClockAction(_runtime.current!, "primary"),
    ];
  }
}
