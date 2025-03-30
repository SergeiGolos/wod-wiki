import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement start logic
    console.log('StartHandler handleEvent triggered for event:', event);
    if (runtime.current) {
      return [new StartTimerAction(event)]; 
    }
    return [];
  }
}
