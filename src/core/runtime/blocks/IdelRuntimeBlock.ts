import { RuntimeBlock } from "./RuntimeBlock";
import { TickHandler } from "../handlers/TickHandler";
import { EmptyResultWriter } from "../logger/EmptyResultWriter";
import { RunHandler } from "../handlers/RunHandler";
import { NextStatementHandler } from "../handlers/NextStatementHandler";

export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {    
    super("idle", [],new EmptyResultWriter(), [  
      new RunHandler(),
      new TickHandler(),   
      new NextStatementHandler()
    ]);
    this.type = 'idle';
  }
}
