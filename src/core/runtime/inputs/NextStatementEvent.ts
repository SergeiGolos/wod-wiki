import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { PushNextAction } from "../actions/PushNextAction";

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
    return [ new PushNextAction() ];
  }
}
