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
 * Implements a block that executes child nodes in a round-robin fashion,
 * where each iteration of the parent round moves to the next child item.
 * 
 * Example:
 * (3)
 *   - 10 Pullups
 *   - 20 Pushups 
 *   - 30 Squats
 * 
 * Execution: 
 * Round 1: Pullups
 * Round 2: Pushups
 * Round 3: Squats
 */
export class RoundRobinBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(source: StatementNodeDetail) {
    super(source);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Increment round index first
    this.index += 1;

    // Check if we've completed all rounds
    if (this.source.rounds && this.index > this.source.rounds) {
      return [new PopBlockAction()];
    }

    // Round-robin: select the child based on current round index
    // If we have 3 children and are on round 2, select child at index 1 (second child)
    const childIndex = (this.index - 1) % this.source.children.length;
    const id = this.source.children[childIndex];
    const statement = runtime.script.getId(id)[0];

    return statement ? [new PushStatementAction(statement)] : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [];
  }
}
