import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, Diff, IDuration, TimeSpanDuration } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { CompleteEvent } from "../events/CompleteEvent";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(_event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    if (runtime.current?.type === 'idle' 
      || runtime.current?.type === 'complete'
      || runtime.current?.duration?.original === 0) {      
      return [];
    }
    
    const spanDuration = new TimeSpanDuration(runtime.current!.duration?.original ?? 0, runtime.current?.laps ?? []);
    const remaining = spanDuration.remaining();
    if ((remaining?.original != undefined) && (remaining.original == 0 || remaining.original < 0)) {
      return [
        new NotifyRuntimeAction(new CompleteEvent(_event.timestamp))
      ];
    }
    return [];
  }
}