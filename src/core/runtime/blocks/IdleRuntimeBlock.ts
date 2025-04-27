import { NextStatementHandler } from "../inputs/NextStatementHandler";
import { RunHandler } from "../inputs/RunHandler";
import { TickHandler } from "../inputs/TickHandler";
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
