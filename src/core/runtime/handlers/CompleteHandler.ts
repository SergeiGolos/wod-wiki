import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { NextStatementAction } from "../actions/NextStatementAction";
import { StopTimerAction } from "../actions/StopTimerAction";

export class CompleteHandler extends EventHandler {
  protected eventType: string = 'complete';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {   
    return [
      new StopTimerAction({ name: 'stop', timestamp: event.timestamp }),       
      new NextStatementAction()
    ];      
  }
}
