import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  ResultSpan,
  PrecompiledNode
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { getLap } from "./readers/getLap";
import { LapFragment } from "@/core/fragments/LapFragment";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { WriteResultAction } from "../outputs/WriteResultAction";


export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  childIndex: number = 0; // Current round for the current child
  lastLap: string = "";
  constructor(source: PrecompiledNode) {
    super([source]);
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== enter : ${this.blockKey}`);
    return [...this.next(runtime), 
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime")];
  }

  next(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== next : ${this.blockKey}`);
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    // Check if we've completed all rounds for the current child        
    if (this.childIndex >= this.sources?.[0]?.children.length || this.lastLap === "-") {
      this.childIndex = 0;   
      this.index += 1;             
    }
    const rounds = this.sources?.[0]?.rounds();
    if (rounds && this.index >= rounds) {
      return [new PopBlockAction()];
    } 

    const statements: PrecompiledNode[] = [];
    let statement: PrecompiledNode | undefined;
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

  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    
    // Create a result span to report completion and metrics for this repeating block
    const resultSpan = new ResultSpan();
    resultSpan.blockKey = this.blockKey;
    resultSpan.index = this.index;
    // Store the current path in the runtime hierarchy
    resultSpan.stack = [this.index];
    resultSpan.start = runtime.history.find(h => h.blockKey === this.blockKey) ?? { name: "start", timestamp: new Date() };
    resultSpan.stop = { timestamp: new Date(), name: "repeating_complete" };    
    resultSpan.metrics = this.sources[0].metrics();
    
    return [
      new WriteResultAction(resultSpan)
    ];
  }
}
