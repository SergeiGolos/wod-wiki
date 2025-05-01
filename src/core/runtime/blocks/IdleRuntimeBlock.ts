import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { NextStatementHandler } from "../inputs/NextStatementEvent";
import { RunHandler } from "../inputs/RunEvent";
import { TickHandler } from "../inputs/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super("idle", -1, undefined);
    this.handlers = [
      new RunHandler(),
      new TickHandler(),
      new NextStatementHandler(),
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
