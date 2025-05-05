import { IRuntimeBlock, StatementNodeDetail, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { PopBlockAction } from "../actions/PopBlockAction";
import { PushStatementAction } from "../actions/PushStatementAction";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * Implements a block that repeats execution of child nodes.
 */


export class RepeatingGroupBlock extends RuntimeBlock implements IRuntimeBlock {
  childIndex: number = 0;
  constructor(source: StatementNodeDetail) {
    super(source);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    if (this.childIndex >= this.source.children.length) {
      this.childIndex = 0;
    }
    if (this.childIndex == 0) {
      this.index += 1;
    }

    if (this.source.rounds && this.index > this.source.rounds) {
      return [new PopBlockAction()];
    }

    const id = this.source.children[this.childIndex];
    const statement = runtime.script.getId(id)[0];
    this.childIndex += 1;
    return statement ? [new PushStatementAction(statement)] : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [];
  }
}
