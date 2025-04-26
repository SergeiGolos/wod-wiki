import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { GotoStatementAction } from "../actions/NextStatementAction";

export class NextStatementHandler extends EventHandler {
  protected eventType: string = "next";

  protected handleEvent(
    _event: IRuntimeEvent,
    runtime: ITimerRuntime
  ): IRuntimeAction[] {
    const node = runtime.current;
    if (node == undefined || node.nextId == undefined) {
      console.error("[NextStatementHandler] Current block is undefined");
      return [];
    } 
    
    return [new GotoStatementAction(node.nextId)]
    
    const statement = node.nextId 
      ? runtime.script.getId()
      : undefined;    


    runtime.goto(statement);
    return [];  
  }
}
