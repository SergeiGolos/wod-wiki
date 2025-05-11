import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeBlock, StatementNodeDetail, ITimerRuntime, IRuntimeAction, ResultSpan, RuntimeMetric } from "@/core/timer.types";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { StartEvent } from "../inputs/StartEvent";
import { StopEvent } from "../inputs/StopEvent";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetClockAction } from "../outputs/SetClockAction";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { getEffort } from "./readers/getEffort";
import { getReps } from "./readers/getReps";
import { getResistance } from "./readers/getResistance";
import { getDistance } from "./readers/getDistance";

export class EffortBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(
    sources: StatementNodeDetail[],
    public handlers: EventHandler[] = []
  ) {    
    super(sources);
    this.handlers = [...handlers, new CompleteHandler()];
    this.index = 1;
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("primary")
    ];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new PopBlockAction()
    ];
  }

  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    
    // Create a result span to report the completed effort and metrics
    const resultSpan = new ResultSpan();
    resultSpan.blockKey = this.blockKey;
    resultSpan.index = this.index;
    resultSpan.stack = [];
    
    // Find start and stop events for this block
    const startEvent = runtime.history.find(h => h.blockKey === this.blockKey && h.name === "start");
    const stopEvent = runtime.history.find(h => h.blockKey === this.blockKey && h.name === "stop") || { timestamp: new Date(), name: "stop" };
    
    resultSpan.start = startEvent;
    resultSpan.stop = stopEvent;
    
    // Extract metrics from the statement sources
    if (this.sources.length > 0) {
      const source = this.sources[0];
      const effortFragment = getEffort(source)?.[0];
      const effort = effortFragment ? effortFragment.effort : "Exercise";
      
      // Create the base metric
      const metric: RuntimeMetric = {
        effort: effort,
        values: []
      };
      
      // Add repetitions if available
      const reps = getReps(source)?.[0];
      if (reps) {
        metric.values.push({
          type: 'repetitions',
          value: parseInt(reps.value, 10) || 0,
          unit: ''
        });
      }
      
      // Add resistance if available
      const resistance = getResistance(source)?.[0];
      if (resistance) {
        metric.values.push({
          type: 'resistance',
          value: parseInt(resistance.value, 10) || 0,
          unit: resistance.units
        });
      }
      
      // Add distance if available
      const distance = getDistance(source)?.[0];
      if (distance) {
        metric.values.push({
          type: 'distance',
          value: parseInt(distance.value, 10) || 0,
          unit: distance.units
        });
      }
      
      resultSpan.metrics.push(metric);
    }
    
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new WriteResultAction(resultSpan)
    ];
  }
}
