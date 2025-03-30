import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class LapHandler extends EventHandler {
  protected eventType: string = 'lap';

  protected handleEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement lap logic
    console.log('LapHandler handleEvent triggered for event:', event);
    return [];
  }
}
