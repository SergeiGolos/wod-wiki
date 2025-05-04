import {
  IRuntimeBlock,
  StatementNode,
  IRuntimeAction,
  ITimerRuntime,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { completeButton } from "@/components/buttons/timerButtons";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { SetClockAction } from "../outputs/SetClockAction";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */
  
export class SingleBlock extends RuntimeBlock implements IRuntimeBlock {  
  constructor(
    blockId: number,
    blockKey: string,
    source: StatementNode,
    public handlers: EventHandler[] = []
  ) {
    super(blockKey, blockId, source);
    this.handlers = [...handlers, new CompleteHandler()];
  }  

  next(): StatementNode | undefined {    
    return undefined;
  }

  visit(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [
      new SetClockAction("primary"),      
      new SetButtonsAction([completeButton], "runtime")];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
