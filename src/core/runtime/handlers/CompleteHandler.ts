import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, WodResultBlock } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { NextStatementAction } from "../actions/NextStatementAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetResultAction } from "../actions/SetResultAction";

export class CompleteHandler extends EventHandler {
  protected eventType: string = 'complete';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
   
    const resultBlock: WodResultBlock = {
      label: 'Completed',
      value: event.timestamp
    };

    return [
      new StopTimerAction({ name: 'stop', timestamp: event.timestamp }), 
      new SetResultAction(resultBlock),
      new NextStatementAction()
    ];      
  }
}
