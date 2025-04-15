import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class ResumeHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement resume logic
    console.log('ResumeHandler handleEvent triggered for event:', event);
    return [];
  }
}
