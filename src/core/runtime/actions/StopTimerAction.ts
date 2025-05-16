import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
  RuntimeMetric,
} from "@/core/timer.types";
import { Subject } from "rxjs/internal/Subject";
import { getDuration } from "../blocks/readers/getDuration";
import { SetClockAction } from "../outputs/SetClockAction";
import { PushActionEvent } from "../inputs/PushActionEvent";

export class StopTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "stop";
  apply(
    runtime: ITimerRuntime,
    input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block) {
      return;
    }
    
    // Set blockKey in event for reference
    this.event.blockKey = block.blockKey;
    
    console.log(`+=== stop_timer : ${block.blockKey}`);
    
    // Get the block context for span management
    const context = block.getContext();
    
    // Collect metrics from the current block
    try {
      // Get metrics from the block and all its children
      const metrics: RuntimeMetric[] = [];
      
      // Get metrics from the current block and its children
      const blockMetrics = block.metrics(true, true);
      if (blockMetrics && blockMetrics.length > 0) {
        metrics.push(...blockMetrics);
      }
      
      // Add metrics to the current span if we have any
      if (metrics.length > 0) {
        console.log(`StopTimerAction: Adding ${metrics.length} metrics to span`, metrics);
        context.addMetricsToCurrentSpan(metrics);
      }
      
      // Close the current span with stop event
      context.closeCurrentSpan(this.event);
      
      // Check if we need to update the clock
      const duration = block.get(getDuration)[0];
      if (duration !== undefined) {
        input.next(
          new PushActionEvent(new SetClockAction("primary"))
        );
      }
    } catch (e) {
      console.error("Error collecting metrics:", e);
    }
  }
}
