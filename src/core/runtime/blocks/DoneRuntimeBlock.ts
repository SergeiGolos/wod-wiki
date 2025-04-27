import { ResetHandler } from "../inputs/ResetHandler";
import { SaveHandler } from "../inputs/SaveHandler";
import { TickHandler } from "../inputs/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";


export class DoneRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super("done", [], [
      new TickHandler(),
      new ResetHandler(),
      new SaveHandler()
    ]);
    this.type = 'complete';
  }
}
