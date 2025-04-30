import { IRuntimeBlock, IRuntimeEvent, ITimerRuntime, StatementNode } from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {    
    
    constructor(source: StatementNode) {
        super(-1, "repeating", source, undefined);
    }

  load(runtime: ITimerRuntime): IRuntimeEvent[] {
    console.log("Method not implemented.");
    return [];
  }

    next(_runtime: ITimerRuntime): StatementNode | undefined {
        console.log("Method not implemented.");
        return undefined;
    }
}
