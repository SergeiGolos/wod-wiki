import { RuntimeBlock } from "./RuntimeBlock";
import { ResetHandler } from "./handlers/ResetHandler";
import { BeginHandler } from "./handlers/BeginHandler";
import { TickHandler } from "./handlers/TickHandler";

export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {    
    super("idle", [], [
      new BeginHandler(),
      new TickHandler(),    
      new ResetHandler()
    ]);
    this.type = 'idle';
  }
}
