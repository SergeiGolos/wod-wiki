import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, NullStatementNode, ResultSpan, StatementNode } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { getDuration } from "./readers/getDuration";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super("done", -1, new NullStatementNode());
    this.handlers = [
      new SaveHandler()
    ];
  }

  visit(runtime: ITimerRuntime): IRuntimeAction[] {    
    this.laps = [{
      blockKey: this.blockKey,
      start: runtime.trace.history.length > 0 ? runtime.trace.history[0].timestamp : new Date(),
      stop: runtime.trace.history.length> 0 ? runtime.trace.history[runtime.trace.history.length - 1].timestamp : new Date(),
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


  next(): StatementNode | undefined {
    return undefined;
  } 
}