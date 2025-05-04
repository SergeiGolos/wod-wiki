import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, IdleStatementNode, ResultSpan, StatementNode, StatementNodeDetail } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { getDuration } from "./readers/getDuration";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super(new IdleStatementNode() as StatementNodeDetail);
    this.handlers = [
      new SaveHandler()
    ];
  }

  visit(runtime: ITimerRuntime): IRuntimeAction[] {    
    const block = "key goes here:"
    this.spans = [{            
      start: runtime.history.length > 0 ? runtime.history[0].timestamp : new Date(),
      stop: runtime.history.length> 0 ? runtime.history[runtime.history.length - 1].timestamp : new Date(),
      metrics: [],
    } as unknown as ResultSpan];
    
    const duration = runtime.trace.fromStack(getDuration);    
    // return [
    //   new SetButtonsAction([resetButton, saveButton], "system"),
    //   new SetButtonsAction([], "runtime"),
    //   new SetClockAction(this, duration, "total"),
    //   new SetDurationAction(new Duration(0), "primary")];
    return [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }


  next(runtime: ITimerRuntime): StatementNode | undefined {
    return undefined;
  } 
}