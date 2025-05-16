import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeAction, ITimerRuntime, PrecompiledNode, ResultSpan, RuntimeMetric } from "@/core/timer.types";
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

export class EffortBlock extends RuntimeBlock {
  constructor(
    sources: PrecompiledNode[],
    handlers: EventHandler[] = []
  ) {    
    super(sources);
    this.handlers = [...handlers, new CompleteHandler()];
    this.ctx.index = 1;
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StartTimerAction(new StartEvent(new Date())),
      new SetButtonsAction([completeButton], "runtime"),
      new SetClockAction("primary")
    ];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new PopBlockAction()
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  /**
   * Calculates metrics for this effort block
   * @param includeChildren Whether to include metrics from child blocks (default: true)
   * @param inheritFromParent Whether to inherit missing metrics from parent blocks (default: true)
   * @returns An array of RuntimeMetric objects representing the metrics for this block
   */
  public metrics(includeChildren: boolean = true, inheritFromParent: boolean = true): RuntimeMetric[] {
    // Start with the base implementation from AbstractBlockLifecycle
    let metrics = super.metrics(includeChildren, inheritFromParent);
    
    // Add any effort-specific metric logic here
    // For example, you might want to add metrics based on the current state of the block
    
    return metrics;
  }

  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completed effort and metrics
    const resultSpans = ResultSpan.fromBlock(this);
    
    // Get metrics for this block and add them to the result span
    const metrics = this.metrics();
    if (metrics && metrics.length > 0) {
      resultSpans.metrics = metrics;
    }
    
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new WriteResultAction(resultSpans)
    ];
  }
}
