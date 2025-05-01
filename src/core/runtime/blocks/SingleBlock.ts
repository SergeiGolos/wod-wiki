import {
  IRuntimeBlock,
  StatementNode,
  IRuntimeAction,
  ITimerRuntime,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

    
export class SingleBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(
    blockId: number,
    blockKey: string,
    source: StatementNode,
    public handlers: EventHandler[] = []
  ) {
    super(blockId, blockKey, source);
    this.handlers = handlers;
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log("Method not implemented.");
    return [];
  }
}
