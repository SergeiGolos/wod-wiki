import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EventHandler } from "@/core/runtime/EventHandler";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { CompleteEvent } from "./CompleteEvent";
import { Duration, SpanDuration } from "@/core/Duration";

export class TickEvent implements IRuntimeEvent {  
  timestamp: Date = new Date();
  name = 'tick';
}

export class TickHandler implements EventHandler {
  readonly eventType: string = 'tick';

  apply(_event: IRuntimeEvent, _runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[] {   
    const duration = block?.duration;
    // If no duration fragment is associated with the block, or
    // if the fragment exists but its 'original' value is undefined 
    // (meaning duration was not specified in the script),
    // then this TickHandler should not cause a completion.
    if (duration == undefined) {
      return [];
    }

    // At this point, durationFragment exists and durationFragment.original is a number (e.g., 0, 10, etc.).
    // An explicit duration (like 0s) was provided.        
    const spans = block?.getSpanBuilder().Spans();
    const elapsed = new SpanDuration(spans ?? []);
    const remaining = new Duration(duration - (elapsed?.original ?? 0));
    // Check if remaining time is zero or negative.
    if (remaining?.original !== undefined && remaining.original <= 0) {
      return [
        new NotifyRuntimeAction(new CompleteEvent(_event.timestamp))
      ];
    }
    return [];
  }
}