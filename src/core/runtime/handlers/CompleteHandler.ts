import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class CompleteHandler extends EventHandler {
  protected eventType: string = 'complete';

  protected handleEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement complete logic
    console.log('CompleteHandler handleEvent triggered for event:', event);
    return [];
  }
}
