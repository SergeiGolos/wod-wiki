import {
  IRuntimeAction,
  ITimerRuntime,
  PrecompiledNode
} from "@/core/timer.types";
import { ResultBuilder } from "../results/ResultBuilder";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { getLap } from "./readers/getLap";
import { LapFragment } from "@/core/fragments/LapFragment";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { WriteResultAction } from "../outputs/WriteResultAction";

export class RepeatingBlock extends RuntimeBlock {
  constructor(source: PrecompiledNode[]) {
    super(source);
    
    // Initialize state in context
    this.ctx.childIndex = 0; // Current round for the current child
    this.ctx.lastLap = "";
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Combine next() actions with additional button setup
    return [...this.doNext(runtime), 
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime")];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    const sourceNode = this.sources?.[0];
    const rounds = sourceNode?.rounds();
    
    // Check if we've completed all rounds for the current child        
    if (this.ctx.childIndex >= sourceNode?.children.length || this.ctx.lastLap === "-") {
      this.ctx.childIndex = 0;   
      this.ctx.index += 1;             
    }
  
    if (rounds && this.ctx.index >= rounds) {
      return [new PopBlockAction()];
    } 

    const statements: PrecompiledNode[] = [];
    let statement: PrecompiledNode | undefined;
    let laps: LapFragment | undefined;
    
    while (true) {      
      this.ctx.childIndex += 1;
      statement = runtime.script.getId(
        sourceNode?.children[this.ctx.childIndex-1]
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

    this.ctx.lastLap = laps?.image ?? "";

    
    return statements.length > 0
      ? [new PushStatementAction(statements)]
      : []; 
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result span to report completion and metrics for this repeating block using ResultBuilder
    // Use the enhanced BlockContext-based approach for events
    const sourceNode = this.sources?.[0];
    const resultSpan = ResultBuilder
      .forBlock(this)
      .withMetrics(sourceNode?.metrics() ?? [])
      .withEventsFromContext()
      // Override the stop event with a repeating_complete event
      .withEvents(undefined, { timestamp: new Date(), name: "repeating_complete" })
      .build();
    
    return [
      new WriteResultAction(resultSpan)
    ];
  }
}
