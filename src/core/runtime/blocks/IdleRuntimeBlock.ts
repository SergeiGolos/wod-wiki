import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IdleStatementNode } from "@/core/IdleStatementNode";
import { ZeroIndexMeta } from "@/core/ZeroIndexMeta";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetSpanAction } from "../outputs/SetSpanAction";
import { ResultSpan } from "@/core/ResultSpan";

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
    const spans = this.getSpanBuilder();
    
    return [
      new SetButtonAction("system", [startButton]), 
      new SetButtonAction("runtime", []),
      new SetSpanAction("primary", spans.Current()),
    ];
  }

  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PopBlockAction()];
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
