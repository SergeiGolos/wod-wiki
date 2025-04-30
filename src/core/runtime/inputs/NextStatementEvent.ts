import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { GoToStatementAction } from "../actions/GoToStatementAction";
import { GotoEndAction } from "../actions/GotoEndAction";
import { GoToNextAction } from "../actions/GoToNextAction";

export class NextStatementEvent implements IRuntimeEvent {
  constructor(timestamp?: Date, blockId?: number) {
    this.timestamp = timestamp ?? new Date();
    this.blockId = blockId;
  }
  timestamp: Date;
  blockId?: number;
  name = "next";
}

export class NextStatementHandler extends EventHandler {
  protected eventType: string = "next";

  protected handleEvent(
    _event: IRuntimeEvent,
    _runtime: ITimerRuntime
  ): IRuntimeAction[] {
      
    return [ new GoToNextAction() ];
  }
}
