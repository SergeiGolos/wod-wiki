import { startButton } from "@/components/buttons/timerButtons";
import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { IdleStatementAction } from "../actions/IdleStatementAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { EventHandler } from "../EventHandler";


export class EndHandler extends EventHandler {
  protected eventType: string = 'end';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement end logic
    console.log('EndHandler handleEvent triggered for event:', event);
    return [
      new IdleStatementAction(), 
      new SetButtonAction(event, [ startButton ])
    ];
  }
}
