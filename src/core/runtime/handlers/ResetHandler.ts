import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement reset logic
    // console.log('ResetHandler handleEvent triggered for event:', event);
    return [];
  }
}
