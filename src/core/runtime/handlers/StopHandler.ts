import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { SetButtonAction } from "../actions/SetButtonAction";
import { resetButton, resumeButton } from "@/components/buttons/timerButtons";
import { StopTimerAction } from "../actions/StopTimerAction";

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement stop logic
    console.log('StopHandler handleEvent triggered for event:', event);
    if (runtime.current) {
      return [
        new StopTimerAction(event),
        new SetButtonAction(event, [
          resumeButton,
          resetButton
        ])
      ];

    }
    return [];
  }
}
