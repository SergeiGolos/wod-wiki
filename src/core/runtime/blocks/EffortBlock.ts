import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
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
import { SetTimerStateAction, TimerState } from "../outputs/SetTimerStateAction";
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
   */  
  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Determine if this effort block has a specific duration
    const duration = this.selectMany(getDuration)[0];
    const timerState = duration?.original 
      ? TimerState.RUNNING_COUNTDOWN 
      : TimerState.RUNNING_COUNTUP;
    
    return [       
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("primary"),
      new SetTimerStateAction(timerState, "primary")
    ];
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return this.blockKey.index >= 1 
    ? [new PopBlockAction()] 
    : [];
  }  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new SetTimerStateAction(TimerState.STOPPED, "primary"),
      new WriteResultAction(this.spans())
    ];
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
