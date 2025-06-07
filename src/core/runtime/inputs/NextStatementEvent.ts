import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EventHandler } from "../EventHandler";

export class NextEvent implements IRuntimeEvent {
  constructor(timestamp?: Date, blockId?: number) {
    this.timestamp = timestamp ?? new Date();
    this.blockId = blockId;
  }
  timestamp: Date;
  blockId?: number;
  name = "next";
}

export class NextStatementHandler implements EventHandler {
  readonly eventType: string = "next";

  apply(
    _event: IRuntimeEvent,
    runtime: ITimerRuntime,
    block: IRuntimeBlock
  ): IRuntimeAction[] {      
    return block.next(runtime);
  }
}
