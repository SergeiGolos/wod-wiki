import { IRuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { DisplayEvent } from "../timer.events";


export class NextStatementHandler extends EventHandler {
  protected eventType: string = 'next';

  protected handleEvent(event: IRuntimeEvent, _stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    const node = runtime.current;
    if (node == undefined) {
      console.error("[NextStatementHandler] Current block is undefined");
      return [];
    }



    const statements = (node?.stack ?? []).map(stmn => runtime.script.getId(stmn.id));

    return [
      new NotifyRuntimeAction(new DisplayEvent(event.timestamp))
    ];
  }
}
