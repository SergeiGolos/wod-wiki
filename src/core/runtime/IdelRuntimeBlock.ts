import { RuntimeBlock } from "./RuntimeBlock";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";

export class IdelRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {    
    super(-1, "idel", [], [
      new StartHandler(),      
      new TickHandler()
    ]);
  }
}
