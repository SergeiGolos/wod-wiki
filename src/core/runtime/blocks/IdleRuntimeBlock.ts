import {
  IdleStatementNode,
  IRuntimeAction,
  ITimerRuntime,
  ZeroIndexMeta
} from "@/core/timer.types";
import { ResultBuilder } from "../results/ResultBuilder";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
import { WriteResultAction } from "../outputs/WriteResultAction";

export class IdleRuntimeBlock extends RuntimeBlock {
  constructor() {
    super([new IdleStatementNode({
      id: -1,
      children: [],
      meta: new ZeroIndexMeta(),
      fragments: []
    })]);
    // Initialize context values
    this.ctx.index = 1;
    this.handlers = [];
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetButtonsAction([startButton], "system"), 
      new SetButtonsAction([], "runtime"),
      new SetClockAction("primary"),
      new SetTimeSpanAction([], "total")
    ];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a span to capture the idle time using ResultBuilder
    // Use the enhanced BlockContext-based approach for events and metrics
    const resultSpan = ResultBuilder
      .forBlock(this)
      .withEventsFromContext()
      .build();

    return [new WriteResultAction(resultSpan)];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }
}
