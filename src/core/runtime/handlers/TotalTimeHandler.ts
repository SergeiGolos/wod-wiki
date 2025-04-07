import { RuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction, TimerFromSeconds } from "@/core/timer.types";
import { SetDisplayAction } from "../actions/SetDisplayAction";
import { EventHandler } from "../EventHandler";
import { SetDisplayLabelAction } from "../actions/SetDisplayLabelAction";
import { fragmentTo } from "@/core/utils";
import { EffortFragment } from "@/core/fragments/EffortFragment";


export class LabelCurrentEffortHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (!runtime.current || runtime.current.type === "idle") {
      return [new SetDisplayLabelAction(event, "idle")];
    }
    const effort = fragmentTo<EffortFragment>(runtime.current.stack![0], "effort");
    return [
      new SetDisplayLabelAction(event, effort?.effort ?? "")
    ];
  }
}

export class TotalTimeHandler extends EventHandler {
  protected eventType: string = 'tick';

  protected handleEvent(event: RuntimeEvent, stack: StatementNode[], runtime: ITimerRuntime): IRuntimeAction[] {
    if (!runtime.current || runtime.current.type === "idle") {
      return [];
    }

    const firstResultStopTime = (runtime.results?.[0]?.start?.timestamp || runtime.current.events[0].timestamp).getTime();
    const currentTickTime = event.timestamp.getTime();
    const timeDifference = currentTickTime - firstResultStopTime; // This might be negative if first result finished before current tick
    const totalTimeTimer = new TimerFromSeconds(timeDifference / 1000); // Convert ms difference to seconds    

    return [
      new SetDisplayAction(event, totalTimeTimer, "totalTime")
    ];
  }
}
