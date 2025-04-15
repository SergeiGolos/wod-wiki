import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { CompleteStatementAction } from "../actions/IdleStatementAction";
import { EventHandler } from "../EventHandler";


export class EndHandler extends EventHandler {
  protected eventType: string = 'end';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the final time    
    return [
      new CompleteStatementAction(),
    ];
  }
}
