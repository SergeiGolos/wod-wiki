import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { completeButton, resumeButton } from "@/components/buttons";
// import { SetButtonAction } from "../actions/SetButtonAction";

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    if (runtime.current) {
      return [
        new StopTimerAction(event),
        //new SetButtonAction(
        //  event,
        //  [resumeButton, completeButton]
        //)
      ];
    }
    return [];
  }
}
