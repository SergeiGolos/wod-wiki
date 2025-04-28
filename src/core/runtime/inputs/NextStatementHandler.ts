import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { GoToStatementAction } from "../actions/GoToStatementAction";
import { completeButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class NextStatementHandler extends EventHandler {
  protected eventType: string = "next";

  protected handleEvent(
    _event: IRuntimeEvent,
    runtime: ITimerRuntime
  ): IRuntimeAction[] {
    const node = runtime.current;
    if (!node || node.nextId == undefined) {
      console.error(
        "[NextStatementHandler] Current block is undefined or has no nextId"
      );
      return [];
    }

    // Delegate navigation to the unified GoToStatementAction
    return [
      new GoToStatementAction(node.nextId),
      new SetButtonsAction([completeButton], "runtime"),
    ];
  }
}
