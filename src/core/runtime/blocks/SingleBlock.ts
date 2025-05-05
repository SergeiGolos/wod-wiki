import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNodeDetail,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { completeButton } from "@/components/buttons/timerButtons";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetClockAction } from "../outputs/SetClockAction";
import { PopBlockAction } from "../actions/PopBlockAction";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */
  
export class SingleBlock extends RuntimeBlock implements IRuntimeBlock {  
  constructor(
    source: StatementNodeDetail,
    public handlers: EventHandler[] = []
  ) {
    super(source);
    this.handlers = [...handlers, new CompleteHandler()];
  }  
  
  enter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [
      new SetClockAction("primary"),      
      new SetButtonsAction([completeButton], "runtime")];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {     
    return [
      new PopBlockAction()
    ];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetClockAction("primary"), 
      new SetButtonsAction([], "runtime")
    ];
  }
}
