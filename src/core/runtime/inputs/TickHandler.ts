import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, TimeSpanDuration } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { CompleteEvent } from "./CompleteEvent";
import { getDuration } from "../blocks/readers/getDuration";

export class TickEvent implements IRuntimeEvent {  
  timestamp: Date = new Date();
  name = 'tick';
}

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(_event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {   
    const block = runtime.trace.current();      
    const duration = block?.get(getDuration, true)[0];
    if (!duration) {
      return [];
    }
    const spanDuration = new TimeSpanDuration(
      duration.original ?? 0, 
      block.getSpans());
    
    const remaining = spanDuration.remaining();
    if ((remaining?.original != undefined) && (remaining.original == 0 || remaining.original < 0)) {
      return [
        new NotifyRuntimeAction(new CompleteEvent(_event.timestamp))
      ];
    }
    return [];
  }
}