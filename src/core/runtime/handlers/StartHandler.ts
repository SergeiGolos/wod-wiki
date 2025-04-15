import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StartTimerAction(event),        
    ];
  }
}
