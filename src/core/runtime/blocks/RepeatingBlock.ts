import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";

/**
 * Implements a block that repeats execution of child nodes.
 */
export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  
  constructor(source: StatementNodeDetail) {
    super(source);    
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    this.index += 1; 
    if (this.source.rounds && this.index > this.source.rounds) {
      return [new PopBlockAction()];
    }
    
    const id = this.source.children[this.index % this.source.children.length];
    const statement = runtime.script.getId(id)[0];
    return statement ? [new PushStatementAction(statement)] : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }  
}
