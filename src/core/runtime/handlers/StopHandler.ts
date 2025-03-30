import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement stop logic
    console.log('StopHandler handleEvent triggered for event:', event);
    return [];
  }
}
