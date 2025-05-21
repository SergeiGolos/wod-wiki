import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { getLap } from "./readers/getLap";
import { LapFragment } from "@/core/fragments/LapFragment";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { RepFragment } from "@/core/fragments/RepFragment";

export class RepeatingBlock extends RuntimeBlock {
  private childIndex: number = 0;    
  private roundIndex: number = 0;
  lastLap: string;

  constructor(
    source: JitStatement[]    
  ) {
    super(source);      
  }
  
  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const actions = this.next(runtime);    
    return [...actions, 
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime")];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    
    const sourceNode = this.sources?.[0];
    const rounds = sourceNode?.round(this.roundIndex);
    
    // Check if we've completed all rounds for the current child        
    if (this.childIndex >= sourceNode?.children.length || this.lastLap === "-") {
      this.childIndex = 0;   
      this.roundIndex += 1;             
    }
  
    if (rounds && this.roundIndex >= rounds.count) {
      return [new PopBlockAction()];
    } 
    
    const statements = this.nextChildStatements(runtime, this.childIndex);
    if (statements.length== 0) {
      return [new PopBlockAction()];
    }
    this.childIndex += statements.length;
    return [new PushStatementAction(statements)];
  } 
  

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Get the current span (created in enter and updated throughout execution)
    const currentSpan = this.spans[this.spans.length - 1];    
    if (currentSpan) {      
      // Add summary information
      return [
        new WriteResultAction(currentSpan)
      ];
    }
    return [];
  }
}

// Make modIndex generic to handle different array types
function modIndex<T>(items: T[] | undefined, index: number): T | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  return items[index % items.length];
}
