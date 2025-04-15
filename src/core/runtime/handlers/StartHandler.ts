import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { stopButton, completeButton } from "@/components/buttons/timerButtons";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Fix: Only trigger StartTimerAction if state is 'idle'
    if (runtime.current?.getState() === 'idle') {
      return [
        new StartTimerAction(event),
        new SetButtonAction(event, [
          stopButton,
          completeButton
        ])
      ];
    }
    return [];
  }
}
