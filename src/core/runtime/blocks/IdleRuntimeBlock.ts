import { IRuntimeBlock, IRuntimeEvent, ITimerRuntime, StatementNode } from "@/core/timer.types";
import { NextStatementHandler } from "../inputs/NextStatementEvent";
import { RunHandler } from "../inputs/RunEvent";
import { TickHandler } from "../inputs/TickHandler";
import { RuntimeBlock } from "./RuntimeBlock";


export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {    
    
    constructor() {
      super(-1, "idle", undefined, undefined);   
      this.handlers = [
        new RunHandler(),
        new TickHandler(),
        new NextStatementHandler()
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
