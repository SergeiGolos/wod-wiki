import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";
import { EventHandler } from "../EventHandler";

export class ResumeHandler extends EventHandler {
  apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement resume logic
    console.log('ResumeHandler apply triggered for event:', event);
    return [];
  }
}
