import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { StartTimerAction } from "../actions/StartTimerAction";
import { EventHandler } from "../EventHandler";

export class DoneHandler extends EventHandler {
  protected eventType: string = 'done';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the lap
    // Assuming lap number can be derived from the current result count + 1        
    return [new StartTimerAction(event)];
  }
}
