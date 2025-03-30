import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class ResumeHandler extends EventHandler {
  protected eventType: string = 'resume';

  protected handleEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement resume logic
    console.log('ResumeHandler handleEvent triggered for event:', event);
    return [];
  }
}
