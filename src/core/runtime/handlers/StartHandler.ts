import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { stopButton, completeButton } from "@/components/buttons/timerButtons";
import { FirstStatementAction } from "../actions/FirstStatementAction";

export class BeginHandler extends EventHandler {
  protected eventType: string = 'begin';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (runtime.current?.type === 'idle') {
      console.log('BeginHandler handleEvent triggered for event:', event);
      return [new FirstStatementAction()];
    }
    return [];
  }
}

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement start logic
    console.log('StartHandler handleEvent triggered for event:', event);
    if (runtime.current?.type !== 'idle') {
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
