import { IRuntimeBlock, IRuntimeEvent, ITimerRuntime, StatementNode } from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

export class CompoundBlock extends RuntimeBlock implements IRuntimeBlock {    

    constructor(public children: IRuntimeBlock[]) {
      super(-1, "compound", undefined, undefined);        
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
