import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { NextStatementEvent } from "../timer.events";
import { RuntimeStack } from "../RuntimeStack";

export class CompleteHandler extends EventHandler {
  protected eventType: string = 'complete';

  protected handleEvent(event: IRuntimeEvent, stack: RuntimeStack, runtime: ITimerRuntime): IRuntimeAction[] {       
    return [
      new StopTimerAction({ name: 'stop', timestamp: event.timestamp }),      
      new NotifyRuntimeAction(new NextStatementEvent(event.timestamp))      
    ];      
  }
}


