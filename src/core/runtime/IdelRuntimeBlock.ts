import { RuntimeBlock } from "./RuntimeBlock";
import { ResetHandler } from "./handlers/ResetHandler";
import { BeginHandler } from "./handlers/BeginHandler";
import { TickHandler } from "./handlers/TickHandler";
import { EmptyResultWriter } from "./RuntimeJit";
import { LabelCurrentEffortHandler } from "./handlers/TotalTimeHandler";

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
