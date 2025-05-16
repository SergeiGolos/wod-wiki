import { completeButton } from "@/components/buttons/timerButtons";
import { IRuntimeAction, ITimerRuntime, PrecompiledNode, ResultSpan } from "@/core/timer.types";
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
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report the completed effort and metrics using ResultBuilder
    // Use the metrics() method from the sources to collect all metrics
    // Use enhanced BlockContext-based approach for events
    const metrics = this.sources.flatMap(s => s.metrics());

    // Create multiple spans - one for each effort type
    const resultSpans = ResultSpan.fromBlock(this)
    
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new SetButtonsAction([], "runtime"),
      new WriteResultAction(resultSpans)
    ];
  }
}
