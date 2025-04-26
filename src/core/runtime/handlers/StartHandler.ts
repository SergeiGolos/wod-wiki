import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { completeButton, pauseButton } from "@/components/buttons";
import { RuntimeStack } from "../RuntimeStack";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: IRuntimeEvent, stack: RuntimeStack, runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StartTimerAction(event),   
      new SetButtonAction(event, [pauseButton, completeButton])     
    ];
  }
}
