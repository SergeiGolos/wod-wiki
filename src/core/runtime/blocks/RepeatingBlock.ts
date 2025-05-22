import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { WriteResultAction } from "../outputs/WriteResultAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StopEvent } from "../inputs/StopEvent";

export class RepeatingBlock extends RuntimeBlock {
  private childIndex: number = 0;    
  private roundIndex: number = 0;
  private lastLap: string;

  constructor(
    source: JitStatement[]    
  ) {
    super(source);      
    this.lastLap = "";
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
    return [
      new StopTimerAction(new StopEvent(new Date())),
      new WriteResultAction(this.spans)
    ];
  }

  /**
   * Implementation of the onBlockStart hook method from the template pattern
   */
  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  /**
   * Implementation of the onBlockStop hook method from the template pattern
   */
  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}