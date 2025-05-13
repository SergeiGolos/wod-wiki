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
    console.log(
      "StopTimerAction: Adding event to runtime.current.events",
      this.event
    );
    const spans = block.getSpans();
    const currentLap =
      spans.length > 0 ? spans[spans.length - 1] : undefined;

    if (currentLap && !currentLap.stop) {
      // Set the stop timestamp
      currentLap.stop = this.event;
      
      // Collect metrics from the current block
      try {
        // Get metrics from all child blocks, recursively
        const metrics: RuntimeMetric[] = block.get<RuntimeMetric>(
          node => node.metrics ? node.metrics() : [], 
          true // Include all children recursively
        );
        
        // Add metrics to the current lap
        if (metrics && metrics.length > 0) {
          console.log(`StopTimerAction: Adding ${metrics.length} metrics to lap`, metrics);
          currentLap.metrics = metrics;
        }
      } catch (e) {
        console.error("Error collecting metrics:", e);
      }
    }

    const duration = block.get(getDuration)[0];
    if (duration != undefined) {
      input.next(
        new PushActionEvent(new SetClockAction("primary"))
      );
    }
  }
}
