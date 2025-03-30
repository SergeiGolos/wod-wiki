import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";
import { EventHandler } from "../EventHandler";

export class ResetHandler extends EventHandler {
  apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement reset logic
    console.log('ResetHandler apply triggered for event:', event);
    return [];
  }
}
