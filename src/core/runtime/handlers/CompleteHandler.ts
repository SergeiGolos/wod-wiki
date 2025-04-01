import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { IdleStatementAction, NextStatementAction } from "../actions/NextStatementAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { startButton } from "@/components/buttons/timerButtons";

export class EndHandler extends EventHandler {
  protected eventType: string = 'end';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement end logic
    console.log('EndHandler handleEvent triggered for event:', event);
    return [new IdleStatementAction(), new SetButtonAction(event, [
      startButton
    ])];
  }
}

export class CompleteHandler extends EventHandler {
  protected eventType: string = 'complete';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // TODO: Implement complete logic
    console.log('CompleteHandler handleEvent triggered for event:', event);

    return [new NextStatementAction()];
  }
}
