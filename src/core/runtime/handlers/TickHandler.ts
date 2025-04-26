import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, Diff, IDuration } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";

export class TickHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(_event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    let remaining: IDuration | undefined;
    if (runtime.current?.type === 'idle' || runtime.current?.type === 'complete') {      
      return [];
    }
    
    if (runtime.current?.duration) {
      remaining = Diff.duration(runtime.current.duration, runtime.current.elapsed());
    }

    if (remaining == undefined || remaining.original == undefined) {
      return [];
    }

    if (remaining.original > 0) {
      return [];
    }

    return [
      // new NotifyRuntimeAction(new CompleteEvent(event.timestamp))
    ];
  }
}