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
import { BlockContext } from "../blocks/BlockContext";

export class StopTimerAction implements IRuntimeAction {
  private context: BlockContext;

  constructor(private event: IRuntimeEvent, context: BlockContext) {
    this.context = context;
  }

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

    const metrics: RuntimeMetric[] = [{
      sourceId: this.context.getBlockId(), 
      effort: "timer_stop", 
      values: [{ type: "repetitions", value: 1, unit: "count" }]
    }];

    // Add metrics to the currently active time span if it exists
    const activeSpan = this.context.getActiveTimeSpan();
    if (activeSpan) {
      activeSpan.metrics = activeSpan.metrics ? [...activeSpan.metrics, ...metrics] : [...metrics];
    }

    // Push metrics to the overall result span for the block
    this.context.pushMetricsToCurrentResult(metrics);

    // Stop the currently active time span, this also adds it to the result span
    this.context.stopActiveTimeSpan(this.event);

    // Check if we need to update the clock
    const duration = block.get(getDuration)[0];
    if (duration !== undefined) {
      input.next(
        new PushActionEvent(new SetClockAction("primary"))
      );
    }
  }
}
