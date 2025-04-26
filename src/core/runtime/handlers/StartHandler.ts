import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { completeButton, pauseButton } from "@/components/buttons";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StartTimerAction(event),   
      new SetButtonAction(event, [pauseButton, completeButton])     
    ];
  }
}
