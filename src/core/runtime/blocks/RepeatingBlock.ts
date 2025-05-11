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
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";


export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  childIndex: number = 0; // Current round for the current child
  lastLap: string = "";
  constructor(source: StatementNodeDetail) {
    super([source]);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return [...this.next(runtime), 
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime")];
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    // Check if we've completed all rounds for the current child        
    if (this.childIndex >= this.sources?.[0]?.children.length || this.lastLap === "-") {
      this.childIndex = 0;   
      this.index += 1;             
    }
    if (this.sources?.[0].rounds && this.index >= this.sources?.[0].rounds) {
      return [new PopBlockAction()];
    } 

    const statements: StatementNodeDetail[] = [];
    let statement: StatementNodeDetail | undefined;
    let laps: LapFragment | undefined;
    
    while (true) {      
      this.childIndex += 1;
      statement = runtime.script.getId(
        this.sources?.[0]?.children[this.childIndex-1]
      )?.[0];
      
      if (!statement) {
        break;
      }      

      laps = getLap(statement)?.[0];
      statements.push(statement);

      if (laps?.image !=="+") {        
        break;
      }            
    }

    this.lastLap = laps?.image ?? "";

    
    return statements.length > 0
      ? [new PushStatementAction(statements, true)]
      : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    return [];
  }
}
