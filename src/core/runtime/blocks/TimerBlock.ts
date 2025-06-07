import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetButtonAction } from "../outputs/SetButtonAction";

import { SetDurationAction } from "../outputs/SetDurationAction";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { StartEvent } from "../inputs/StartEvent";
import { StopEvent } from "../inputs/StopEvent";

/**
 * RuntimeBlock for standalone timer statements (duration only, no metrics)
 * Handles scenarios like "30s", "2m", "1m30s"
 */
export class TimerBlock extends RuntimeBlock {
  constructor(sources: JitStatement[]) {
    super(sources);
    this.leaf = true; // Mark as leaf-level execution block
    
    // Add handler for user completion
    this.handlers.push(new CompleteHandler());
  }

  /**
   * Called when the timer block is entered
   * Sets up the timer state and UI controls
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const duration = this.duration;   
    const actions: IRuntimeAction[] = [
      new StartTimerAction(new StartEvent()),
      new SetButtonAction("system", [endButton, pauseButton]),
      new SetButtonAction("runtime", [completeButton])
    ];

    // Add duration reporting for countdown timers
    if (duration) {
      actions.push(new SetDurationAction(duration, "primary"));
    }

    return actions;
  }

  /**
   * Called when advancing to next statement (completion)
   */
  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }

  /**
   * Called when leaving the timer block
   * Cleans up timer state
   */
  protected onLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StopTimerAction(new StopEvent()),      
    ];
  }

  /**
   * Called when the timer actually starts running
   */
  protected onBlockStart(runtime: ITimerRuntime): IRuntimeAction[] {
    // Timer blocks are simple - no additional setup needed
    return [];
  }

  /**
   * Called when the timer stops running
   */
  protected onBlockStop(runtime: ITimerRuntime): IRuntimeAction[] {
    // Timer blocks are simple - no additional cleanup needed
    return [];
  }
}