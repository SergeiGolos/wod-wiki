import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, IdleStatementNode, ResultSpan, StatementNodeDetail } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";
import { SetClockAction, SetTimeSpanAction } from "../outputs/SetClockAction";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super(new IdleStatementNode() as StatementNodeDetail);
    this.handlers = [
      new SaveHandler()
    ];
    this.spans = [];
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {    
    console.log(`+=== enter : ${this.blockKey}`);
    this.spans = [{            
      start: runtime.history[0] ?? { name: "start", timestamp: new Date() },
      stop: runtime.history[runtime.history.length - 1] ?? { timestamp: new Date() , name: "stop" },
    }];
      
    return [
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),      
      new SetTimeSpanAction(this.spans, "total"),
      new SetClockAction("primary")];    
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }


  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  } 
}