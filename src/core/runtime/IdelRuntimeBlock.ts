import { RuntimeBlock } from "./RuntimeBlock";
import { ResetHandler } from "./handlers/ResetHandler";
import { BeginHandler } from "./handlers/BeginHandler";
import { TickHandler } from "./handlers/TickHandler";
import { LabelCurrentEffortHandler } from "./handlers/TotalTimeHandler";
import { EmptyResultWriter } from "./logger/EmptyResultWriter";

export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {    
    super("idle", [],new EmptyResultWriter(), [  
      new BeginHandler(),
      new TickHandler(),          
      new LabelCurrentEffortHandler(),
      new ResetHandler()
    ]);
    this.type = 'idle';
  }
}
