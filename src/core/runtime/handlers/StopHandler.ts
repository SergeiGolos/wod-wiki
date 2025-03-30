import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";
import { EventHandler } from "../EventHandler";

export class StopHandler extends EventHandler {
  apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement stop logic
    console.log('StopHandler apply triggered for event:', event);
    return [];
  }
}
