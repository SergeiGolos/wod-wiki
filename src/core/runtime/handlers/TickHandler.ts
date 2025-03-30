import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";
import { EventHandler } from "../EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";

export class TickHandler extends EventHandler {
  apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (event.type === 'Tick') {
      // TODO: Implement actual timer logic for setting the time display
      // For now, just creating the action
      return [new StartTimerAction(event)];
    }
    return [];
  }
}