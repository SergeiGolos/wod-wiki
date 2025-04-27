import { NextStatementHandler } from "../handlers/NextStatementHandler";
import { RunHandler } from "../handlers/RunHandler";
import { TickHandler } from "../handlers/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";


export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor(firstId: number) {
    super("idle", [], [
      new RunHandler(),
      new TickHandler(),
      new NextStatementHandler()
    ]);
    this.type = 'idle';
    this.nextId = firstId;
  }
}
