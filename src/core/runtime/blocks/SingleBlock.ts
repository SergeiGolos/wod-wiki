import { IRuntimeBlock, StatementNode, IDuration, IActionButton, IRuntimeEvent, ResultSpan, RuntimeMetric, IRuntimeAction, ITimerRuntime } from "@/core/timer.types";
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

  next(runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }

  load(runtime: ITimerRuntime): IRuntimeEvent[] {
    console.log("Method not implemented.");
    return [];
  }
}
