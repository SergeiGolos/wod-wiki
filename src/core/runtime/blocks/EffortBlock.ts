import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeBlock, ITimerRuntime, IRuntimeAction, ResultSpan, RuntimeMetric, PrecompiledNode } from "@/core/timer.types";
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

export class EffortBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(
    sources: PrecompiledNode[],
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
    resultSpan.stack = this.get<number>(n=>[n.id], true);
    
    const metrics = this.get<RuntimeMetric>(n=>n.metrics(), true);
    resultSpan.metrics = metrics;


    
    // Find start and stop events for this block
    const startEvent = runtime.history.find(h => h.blockKey === this.blockKey && h.name === "start");
    const stopEvent = runtime.history.find(h => h.blockKey === this.blockKey && h.name === "stop") || { timestamp: new Date(), name: "stop" };
    
    resultSpan.start = startEvent;
    resultSpan.stop = stopEvent;
    
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new WriteResultAction(resultSpan)
    ];
  }
}
