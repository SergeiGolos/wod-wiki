import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { getLap } from "./readers/getLap";
import { LapFragment } from "@/core/fragments/LapFragment";

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
  childIndex: number = 0; // Current round for the current child

  constructor(source: StatementNodeDetail) {
    super([source]);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return this.next(runtime);
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    // Check if we've completed all rounds for the current child
    let restarted = false;
    
    if (this.childIndex >= this.sources?.[0]?.children.length) {
      this.childIndex = 0;      
      restarted = true;
    }

    if (this.sources?.[0].rounds && this.index >= this.sources?.[0].rounds) {
      return [new PopBlockAction()];
    }

    const statements: StatementNodeDetail[] = [];
    let statement: StatementNodeDetail | undefined;
    let laps: LapFragment | undefined;
    while (true) {
      statement = runtime.script.getId(
        this.sources?.[0]?.children[this.childIndex]
      )?.[0];
      if (!statement) {
        break;
      }

      laps = getLap(statement)?.[0];

      if (statements.length == 0 || laps?.image === "+") {
        statements.push(statement);
        this.childIndex += 1;
      } else {
        break;
      }
    }

    if (laps?.image === "-" || restarted) {
      this.index += 1;
    }

    return statements.length > 0
      ? [new PushStatementAction(statements, true)]
      : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [];
  }
}
