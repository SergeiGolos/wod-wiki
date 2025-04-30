import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { GoToStatementAction } from "../actions/GoToStatementAction";
import { GotoEndAction } from "../actions/GotoEndAction";

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
    runtime: ITimerRuntime,
  ): IRuntimeAction[] {
    const block = runtime.next();
    
    if (!block) {
      return [
        new GotoEndAction()
      ];
    }
    return [ ];
  }
}
