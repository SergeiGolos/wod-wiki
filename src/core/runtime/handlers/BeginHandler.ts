import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { FirstStatementAction } from "../actions/FirstStatementAction";
import { EventHandler } from "../EventHandler";


export class BeginHandler extends EventHandler {
  protected eventType: string = 'begin';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (runtime.current?.getState() === 'idle') {      
      return [new FirstStatementAction()];
    }
    return [];
  }
}
