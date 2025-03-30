import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";
import { EventHandler } from "../EventHandler";

export class LapHandler extends EventHandler {
  apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement lap logic
    console.log('LapHandler apply triggered for event:', event);
    return [];
  }
}
