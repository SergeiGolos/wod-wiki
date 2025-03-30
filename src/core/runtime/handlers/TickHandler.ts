import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "@/core/runtime/actions/StartTimerAction";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // No need to check event.type here, base class handles it
    // TODO: Implement actual timer logic for setting the time display
    // For now, just creating the action
    return [];
  }
}