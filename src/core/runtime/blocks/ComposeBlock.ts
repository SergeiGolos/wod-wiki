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
 * Implements a block that executes all child nodes as a single unit per round.
 * Cycles through all children before advancing to the next round.
 * 
 * Example:
 * (3)
 *   + 10 Pullups
 *   + 20 Pushups 
 *   + 30 Squats
 * 
 * Execution: 
 * Round 1: Pullups, then Pushups, then Squats
 * Round 2: Pullups, then Pushups, then Squats
 * Round 3: Pullups, then Pushups, then Squats
 */
export class ComposeBlock extends RuntimeBlock implements IRuntimeBlock {
  childIndex: number = 0;
  
  constructor(source: StatementNodeDetail) {
    super(source);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // If we've gone through all children in this round, move to next round
    if (this.childIndex >= this.source.children.length) {
      this.childIndex = 0;
      this.index += 1;
    }
    
    // Check if we've completed all rounds
    if (this.source.rounds && this.index > this.source.rounds) {
      return [new PopBlockAction()];
    }

    // Get the next child to execute
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
