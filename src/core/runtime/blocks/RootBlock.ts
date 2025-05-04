import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  NullStatementNode,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushBlockAction, PushStatementAction } from "../actions/PushStatementAction";


/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(private statements: StatementNode[]) {
    super("root", -1, new NullStatementNode());
    this.index = -1; // preload visit;
  }

  visit(runtime: ITimerRuntime): IRuntimeAction[] {    
    if (this.index == 0) {      
      const children = this.statements
        .filter((s) => s.parent === undefined)
        .map((s) => s.id);
      this.source.children = [...children];    
      return [new PushBlockAction(runtime.jit.idle(runtime))];
    }
    
    const next = this.next();
    if (next) {
      return [new PushStatementAction(next)];
    }

    return [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {    
    return [];
  }

  next(): StatementNode | undefined {      
    const next = this.index;
    return this.statements[next % this.statements.length];
  }
}