import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
} from "@/core/timer.types";
import { Subject } from "rxjs";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block || block.blockId == "-1") {
      return;
    }
    
    // Set blockKey in the event for reference
    this.event.blockKey = block.blockKey;
    
    // Note: Runtime history isn't needed since we're tracking in block context
    // We focus on the block's context for robust event tracking
    
    // Get the block context and its current span
    const context = block.getContext();
    
    // Update the blockKey in the context for consistency
    context.blockKey = block.blockKey;
    
  const currentSpan = context.getCurrentSpan();
    
    // If there's no current span or it's already closed, create a new one
    if (!currentSpan || currentSpan.stop) {
      context.addSpan(this.event);
    }
    
    console.log(`+=== start_timer : ${block.blockKey}`);
  }
}
