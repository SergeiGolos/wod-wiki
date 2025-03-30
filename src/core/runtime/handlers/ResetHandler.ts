import { RuntimeEvent, ITimerRuntime, IRuntimeAction  } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement reset logic
    console.log('ResetHandler handleEvent triggered for event:', event);
    return [];
  }
}
