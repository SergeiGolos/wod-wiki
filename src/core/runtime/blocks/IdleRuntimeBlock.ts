import { NextStatementHandler } from "../handlers/NextStatementHandler";
import { RunHandler } from "../handlers/RunHandler";
import { TickHandler } from "../handlers/TickHandler";
import { EmptyResultWriter } from "../logger/EmptyResultWriter";
import { RuntimeBlock } from "./RuntimeBlock";


export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor(firstId: number) {
    super("idle", [], new EmptyResultWriter(), [
      new RunHandler(),
      new TickHandler(),
      new NextStatementHandler()
    ]);
    this.type = 'idle';
    this.blockId = firstId;
  }
}
