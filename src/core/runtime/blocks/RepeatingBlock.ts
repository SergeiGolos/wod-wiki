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
 * Implements the Repeat pattern (no operator) where each child individually
 * goes through all parent rounds before moving to the next child.
 * 
 * Example:
 * (3)
 *   10 Pullups
 *   20 Pushups
 * 
 * Execution: 
 * 3 rounds of Pullups, then 3 rounds of Pushups
 */
export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  currentChild: number = 0;  // Which child we're currently processing
  childRound: number = 1;   // Current round for the current child
  
  constructor(source: StatementNodeDetail) {
    super(source);    
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {    
    // Check if we've completed all rounds for the current child
    if (this.source.rounds && this.childRound > this.source.rounds) {
      // Move to the next child and reset round counter
      this.currentChild += 1;
      this.childRound = 1;
      
      // If we've gone through all children, we're done
      if (this.currentChild >= this.source.children.length) {
        return [new PopBlockAction()];
      }
    }
    
    // Get the current child to execute
    const id = this.source.children[this.currentChild];
    const statement = runtime.script.getId(id)[0];
    
    // Increment the round for the current child
    this.childRound += 1;
    
    return statement ? [new PushStatementAction(statement)] : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [];
  }  
}
