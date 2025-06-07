import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EventHandler } from "../EventHandler";

export class PushActionEvent implements IRuntimeEvent {
  constructor(public action: IRuntimeAction) {    
  }
  timestamp: Date = new Date();
  name: string = "push";
}

export class PushActionHandler implements EventHandler {
  readonly eventType: string = 'push';

  apply(event: IRuntimeEvent, _runtime: ITimerRuntime, _block: IRuntimeBlock): IRuntimeAction[] {    
    const actionEvent = event as PushActionEvent;    
    return [actionEvent.action];
  }
}
