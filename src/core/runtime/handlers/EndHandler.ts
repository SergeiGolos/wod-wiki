import { startButton } from "@/components/buttons/timerButtons";
import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction, WodResultBlock } from "@/core/timer.types";
import { IdleStatementAction } from "../actions/IdleStatementAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { SetResultAction } from "../actions/SetResultAction";
import { EventHandler } from "../EventHandler";


export class EndHandler extends EventHandler {
  protected eventType: string = 'end';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the final time
    const finalResult: WodResultBlock = {
      label: "Total Time",
      value: event.timestamp // Use the event timestamp as the final time
    };

    console.log('EndHandler creating result:', finalResult);

    return [
      new SetResultAction(finalResult),
      new IdleStatementAction(), 
      new SetButtonAction(event, [ startButton ])
    ];
  }
}
