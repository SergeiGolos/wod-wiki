import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { MetricValue } from "@/core/MetricValue";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { RuntimeBlock } from "./RuntimeBlock"; 
import { StopEvent } from "../inputs/StopEvent"; 
import { WriteResultAction } from "../outputs/WriteResultAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StartEvent } from "../inputs/StartEvent";
import { completeButton } from "@/components/buttons/timerButtons"; 
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetClockAction } from "../outputs/SetClockAction";

export class EffortBlock extends RuntimeBlock {
  // logger is inherited from AbstractBlockLifecycle

  constructor(
    sources: JitStatement[],        
  ) {
    super(sources);
    this.handlers.push(new CompleteHandler());
  }

  /**
   * Extract effort descriptions from the metrics for display purposes
   * @returns Array of effort descriptions
   */  
  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
   return [       
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("runtime")
    ];
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return this.blockKey.index >= 1 
    ? [new PopBlockAction()] 
    : [];
  }

  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new WriteResultAction(this.spans)
    ];
  }
}
