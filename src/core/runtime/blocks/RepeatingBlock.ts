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
  private lastLap: string = "";
  private currentRoundIndex: number = 0; // Tracks the current completed round + 1 (for next round)

  constructor(
    source: JitStatement[]    
  ) {
    super(source);      
  }
  
  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const actions = this.onNext(runtime);
    
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
    const statements: JitStatement[] = [];
    let statement: JitStatement | undefined;
    let laps: LapFragment | undefined;
    
    while (true && this.childIndex < (sourceNode?.children.length ?? 0)) {      
      this.childIndex += 1;
      statement = runtime.script.getId(
        sourceNode?.children[this.childIndex-1]
      )?.[0];
      
      if (!statement) {
        break;
      }      
      
      const lap =modIndex(getLap(statement)??[], this.childIndex-1);
      if (lap?.image !=="-") {
        // Apply parent's repetition scheme if child has none
        const parentRepScheme = sourceNode?.repetitions();
        if (parentRepScheme && parentRepScheme.length > 0) {
            const repsForCurrentRoundFragment = modIndex(parentRepScheme, this.currentRoundIndex);
            if (repsForCurrentRoundFragment && repsForCurrentRoundFragment.reps != null) {
              statement.fragments.push(new RepFragment(repsForCurrentRoundFragment.reps));
            }
        }
      }
      
      statements.push(statement);

      if (laps?.image !=="+") {        
        break;
      }         
    }

    this.lastLap = laps?.image ?? "";
   

    
    return statements.length > 0
      ? [new PushStatementAction(statements)]
      : []; 
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
