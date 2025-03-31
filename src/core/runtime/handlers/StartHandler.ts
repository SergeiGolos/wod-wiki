import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, TimerDisplayBag } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetDisplayAction } from "../actions/SetDisplayAction";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement start logic
    console.log('StartHandler handleEvent triggered for event:', event);
    if (!runtime.current) {
      return [
        new StartTimerAction(event),
        new SetDisplayAction(event,  {} as TimerDisplayBag)];

    }
    return [];
  }
}
