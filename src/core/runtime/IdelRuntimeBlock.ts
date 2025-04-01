import { RuntimeBlock } from "./RuntimeBlock";
import { ResetHandler } from "./handlers/ResetHandler";
import { BeginHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";

export class IdleRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {    
    super(-1, "idle", [], [
      new BeginHandler(),
      new TickHandler(),    
      new ResetHandler()
    ]);
    this.type = 'idle';
  }
}
