import {
  IdleStatementNode,
  IRuntimeAction,
  ITimerRuntime,
  ZeroIndexMeta
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
import { MetricsRelationshipType } from "@/core/metrics";

export class IdleRuntimeBlock extends RuntimeBlock {
  constructor() {
    super([
      new IdleStatementNode({
        id: -1,
        children: [],
        meta: new ZeroIndexMeta(),
        fragments: []
      })
    ], undefined, MetricsRelationshipType.INHERIT);
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
    return [];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }
}
