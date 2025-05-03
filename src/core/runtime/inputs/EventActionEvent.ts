import { IRuntimeEvent, IRuntimeAction, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

// Timers

export class LoadActionEvent implements IRuntimeEvent {
  constructor(public action: IRuntimeAction) {    
  }
  timestamp: Date = new Date();
  name: string = "load";
}

export class LoadActionHandler extends EventHandler {
  protected eventType: string = 'load';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    console.debug('LoadActionHandler processing load event');  
    const actionEvent = event as LoadActionEvent;    
    return [actionEvent.action];
  }
}
