import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  IdleStatementNode,
  StatementNode,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import {
  PushIdleBlockAction,
  PushEndBlockAction,
  PushStatementAction,
} from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(private statements: StatementNode[]) {
    super(new IdleStatementNode() as StatementNodeDetail);
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    const children = this.statements
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);
    this.source.children = [...children];

    return [new PushIdleBlockAction()];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.index += 1;
    if (this.index > this.statements.length) {
      return [new PopBlockAction()];
    }

    const statement = this.statements[this.index-1];
    return [new PushStatementAction(statement)];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new PushEndBlockAction()];
  }
}
