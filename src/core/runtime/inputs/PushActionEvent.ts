import { IRuntimeEvent, IRuntimeAction, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

export class PushActionEvent implements IRuntimeEvent {
  constructor(public action: IRuntimeAction) {    
  }
  timestamp: Date = new Date();
  name: string = "push";
}

export class PushActionHandler extends EventHandler {
  protected eventType: string = 'push';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {    
    const actionEvent = event as PushActionEvent;    
    return [actionEvent.action];
  }
}
