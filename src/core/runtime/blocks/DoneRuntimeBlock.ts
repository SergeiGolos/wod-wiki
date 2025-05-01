import { IRuntimeAction, IRuntimeBlock, ITimerRuntime, StatementNode } from "@/core/timer.types";
import { ResetHandler } from "../inputs/ResetEvent";
import { SaveHandler } from "../inputs/SaveEvent";
import { TickHandler } from "../inputs/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super(-1, "done", undefined);   
    this.handlers = [
      new TickHandler(),
      new ResetHandler(),
      new SaveHandler()
    ];
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [new SetButtonsAction([resetButton, saveButton], "")];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }
  
}