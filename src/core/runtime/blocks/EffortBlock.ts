import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeBlock } from "./RuntimeBlock"; 
import { StopEvent } from "../inputs/StopEvent"; 
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StartEvent } from "../inputs/StartEvent";
import { completeButton } from "@/components/buttons/timerButtons"; 
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetTimerStateAction, TimerState } from "../outputs/SetTimerStateAction";
import { SetEffortAction } from "../outputs/SetEffortAction";
import { getDuration } from "../blocks/readers/getDuration";

export class EffortBlock extends RuntimeBlock {
  // logger is inherited from AbstractBlockLifecycle
  constructor(
    sources: JitStatement[],        
  ) {
    super(sources);
    this.handlers.push(new CompleteHandler());
    this.leaf = true; // mark as leaf-level block
  }

  /**
   * Extract effort descriptions from the metrics for display purposes
   * @returns Array of effort descriptions
   */  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Determine if this effort block has a specific duration
    const duration = this.selectMany(getDuration)[0];
    const timerState = duration?.original 
      ? TimerState.RUNNING_COUNTDOWN 
      : TimerState.RUNNING_COUNTUP;
    
    // Get effort information from metrics to display in timer
    const metrics = this.metrics(runtime);
    const effortText = metrics.length > 0 ? metrics[0].effort : "Exercise";
    
    const actions = [       
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("primary"),
      new SetTimerStateAction(timerState, "primary"),
      new SetEffortAction(effortText, "primary")
    ];
    
    return actions;
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return this.blockKey.index >= 1 
    ? [new PopBlockAction()] 
    : [];
  }  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),      
    ];
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
