import {
  IdleStatementNode,
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  ResultSpan,
  ZeroIndexMeta,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
import { WriteResultAction } from "../outputs/WriteResultAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super([new IdleStatementNode({
      id: -1,
      children: [],
      meta: new ZeroIndexMeta(),
      fragments: []
    })]);
    this.index = 1;
    this.handlers = [
    ];
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return [
      new SetButtonsAction([startButton], "system"), 
      new SetButtonsAction([], "runtime"),
      new SetClockAction("primary"),
      new SetTimeSpanAction([], "total")
    ];
  }

  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    
    // Create a result span to report the completion of this block
    const resultSpan = new ResultSpan();
    resultSpan.blockKey = this.blockKey;
    resultSpan.start = runtime.history.find(h => h.blockKey === this.blockKey) ?? { name: "start", timestamp: new Date() };
    resultSpan.stop = { timestamp: new Date(), name: "idle_complete" };
    
    return [
      new WriteResultAction(resultSpan)
    ];
  }
  /**
   * Returns the actions to execute when transitioning from idle state
   * In an idle state, we want to start executing the first node in the script
   */
  next(_runtime: ITimerRuntime): IRuntimeAction[] {    
    console.log(`+=== next : ${this.blockKey}`);
    // Get the first node from the script stack if available   
    return [
      new PopBlockAction()
    ];
  }
}
