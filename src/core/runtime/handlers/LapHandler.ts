import { RuntimeEvent, ITimerRuntime, IRuntimeAction, StatementNode, WodResultBlock } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { SetResultAction } from "../actions/SetResultAction";

export class LapHandler extends EventHandler {
  protected eventType: string = 'lap';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the lap
    // Assuming lap number can be derived from the current result count + 1
    const lapNumber = runtime.results.length + 1;
    const result: WodResultBlock = {
      label: `Lap ${lapNumber}`,
      value: event.timestamp // Use the event timestamp as the lap time
    };

    console.log('LapHandler creating result:', result);
    return [new SetResultAction(result)];
  }
}
