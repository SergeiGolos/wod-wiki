import { Duration, IRuntimeAction, IRuntimeBlock, ITimerRuntime, ResultSpan, StatementNode } from "@/core/timer.types";
import { SaveHandler } from "../inputs/SaveEvent";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";
import { SetClockAction, SetDurationAction } from "../outputs/SetClockAction";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super("done", -1, undefined);
    this.handlers = [
      new SaveHandler()
    ];
  }

  load(runtime: ITimerRuntime): IRuntimeAction[] {    
    this.laps = [{
      blockKey: this.blockKey,
      start: runtime.trace.history.length > 0 ? runtime.trace.history[0].timestamp : new Date(),
      stop: runtime.trace.history.length> 0 ? runtime.trace.history[runtime.trace.history.length - 1].timestamp : new Date(),
      metrics: [],
    } as unknown as ResultSpan];
    
    return [
      new SetButtonsAction([resetButton, saveButton], "system"),
      new SetButtonsAction([], "runtime"),
      new SetClockAction(this, "total"),
      new SetDurationAction(new Duration(0), "primary")];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  } 
}