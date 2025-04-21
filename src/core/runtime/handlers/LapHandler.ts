import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";

export class LapHandler extends EventHandler {
  protected eventType: string = 'lap';

  protected handleEvent(event: IRuntimeEvent, _stack: StatementNode[], _runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the lap
    // Assuming lap number can be derived from the current result count + 1        
    return [new StartTimerAction(event)];
  }
}
