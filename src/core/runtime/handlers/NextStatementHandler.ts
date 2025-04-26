import {
  IRuntimeEvent,
  StatementNode,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { DisplayEvent } from "../timer.events";
import { RuntimeStack } from "../RuntimeStack";

export class NextStatementHandler extends EventHandler {
  protected eventType: string = "next";

  protected handleEvent(
    event: IRuntimeEvent,
    stack: RuntimeStack,
    runtime: ITimerRuntime
  ): IRuntimeAction[] {
    const node = runtime.current;
    if (node == undefined) {
      console.error("[NextStatementHandler] Current block is undefined");
      return [];
    }
    
    const statement = runtime?.current?.nextId 
      ? stack.getId(runtime?.current?.nextId)
      : undefined;    

    runtime.goto(statement);
    return [new NotifyRuntimeAction(new DisplayEvent(event.timestamp))];
  }
}
