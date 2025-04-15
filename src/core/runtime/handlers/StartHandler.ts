import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { pauseButton, endButton } from "@/components/buttons/timerButtons";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Only trigger StartTimerAction if state is 'idle'
    if (runtime.current?.getState() === 'idle') {
      // Only show Pause and End (Done) for now
      const buttons = [pauseButton, endButton];
      return [
        new StartTimerAction(event),
        new SetButtonAction(event, buttons)
      ];
    }
    return [];
  }
}
