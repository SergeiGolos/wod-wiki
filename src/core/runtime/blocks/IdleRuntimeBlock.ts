import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super("idle", -1, undefined);
    this.handlers = [
    ];
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new SetButtonsAction([startButton], "system")];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }
}
