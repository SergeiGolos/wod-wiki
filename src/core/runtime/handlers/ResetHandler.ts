import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { IdleStatementAction } from "../actions/IdleStatementAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { startButton } from "@/components/buttons/timerButtons";

export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement reset logic
    return [new IdleStatementAction(), new SetButtonAction(event, [
      startButton
    ])];
  }
}
