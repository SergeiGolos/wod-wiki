import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { IdleStatementNode } from "@/core/IdleStatementNode";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
import { PopBlockAction } from "../actions/PopBlockAction";

export class IdleRuntimeBlock extends RuntimeBlock {
  constructor() {
    super([
      new IdleStatementNode({
        id: -1,
        children: [],
        meta: new ZeroIndexMeta(),
        fragments: []
      })
    ]);
  }

  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetButtonsAction([startButton], "system"), 
      new SetButtonsAction([], "runtime"),
      new SetClockAction("primary"),
      new SetTimeSpanAction([], "total")
    ];
  }

  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
