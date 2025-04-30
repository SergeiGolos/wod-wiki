import { IRuntimeBlock, IRuntimeEvent, ITimerRuntime, StatementNode } from "@/core/timer.types";
import { ResetHandler } from "../inputs/ResetEvent";
import { SaveHandler } from "../inputs/SaveEvent";
import { TickHandler } from "../inputs/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";

export class DoneRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  constructor() {
    super(-1, "done", undefined);   
    this.handlers = [
      new TickHandler(),
      new ResetHandler(),
      new SaveHandler()
    ];
  }

  load(runtime: ITimerRuntime): IRuntimeEvent[] {
    console.log("Method not implemented.");
    return [];
  }

  next(runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }
  
}