import {
  IdleStatementNode,
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { PopBlockAction } from "../actions/PopBlockAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super(new IdleStatementNode() as StatementNodeDetail);
    this.handlers = [
    ];
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new SetButtonsAction([startButton], "system"), 
      new SetButtonsAction([], "runtime")
    ];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  /**
   * Returns the actions to execute when transitioning from idle state
   * In an idle state, we want to start executing the first node in the script
   */
  next(_runtime: ITimerRuntime): IRuntimeAction[] {    
    // Get the first node from the script stack if available   
    return [
      new PopBlockAction()
    ];
  }
}
