import {
  IdleStatementNode,
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super(new IdleStatementNode() as StatementNodeDetail);
    this.handlers = [
    ];
  }

  visit(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new SetButtonsAction([startButton], "system")];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  /**
   * Returns the next statement to execute when transitioning from idle state
   * In an idle state, we want to start executing the first node in the script
   */
  next(runtime: ITimerRuntime): StatementNode | undefined {    
    // Get the first node from the script stack if available   
    return undefined;
  }
}
