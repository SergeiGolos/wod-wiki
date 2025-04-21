import { ResetHandler } from "../handlers/ResetHandler";
import { SaveHandler } from "../handlers/SaveHandler";
import { TickHandler } from "../handlers/TickHandler";
import { EmptyResultWriter } from "../logger/EmptyResultWriter";
import { RuntimeBlock } from "./RuntimeBlock";


export class DoneRuntimeBlock extends RuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super("done", [], new EmptyResultWriter(), [
      new TickHandler(),
      new ResetHandler(),
      new SaveHandler()
    ]);
    this.type = 'done';
  }
}
