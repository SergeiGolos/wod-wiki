import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PushStatementWithTimerAction } from "../actions/PushStatementWithTimerAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonAction } from "../outputs/SetButtonAction";

import { StopTimerAction } from "../actions/StopTimerAction";
import { StopEvent } from "../inputs/StopEvent";
import { CompleteHandler } from "../inputs/CompleteEvent";
import { getDuration } from "./readers/getDuration";
import { Duration } from "@/core/Duration";

export class RepeatingBlock extends RuntimeBlock {
  private childIndex: number = 0;    
  private roundIndex: number = 0;
  private lastLap: string;  constructor(
    compiledMetrics: RuntimeMetric[],
    source?: JitStatement[]    
  ) {
    // Pass compiled metrics to base class with optional legacy sources
    super(compiledMetrics, source);      
    this.lastLap = "";
    
    // Add specialized handlers for user interactions
    this.handlers.push(new CompleteHandler());    
  }
  
  /**
   * Implementation of the doEnter hook method from the template pattern
   */  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const actions = this.next(runtime);    
    return [...actions, 
      new SetButtonAction("system", [endButton, pauseButton]),
      new SetButtonAction("runtime", [completeButton])];
  }

  /**
   * Implementation of the doNext hook method from the template pattern
   */  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    
    // TODO: During migration, use legacy sources for fragment-dependent operations
    const sourceNode = this._legacySources?.[0];
    const rounds = sourceNode?.round(this.roundIndex);    
    // Check if we've completed all rounds for the current child        
    if (this.childIndex >= (sourceNode?.children?.length || 0) || this.lastLap === "-") {
      this.childIndex = 0;   
      this.roundIndex += 1;             
    }
  
    if (rounds && this.roundIndex >= rounds.count) {
      return [new PopBlockAction()];
    }     const statements = this.nextChildStatements(runtime, this.childIndex);
    if (statements.length== 0) {
      return [new PopBlockAction()];
    }
    this.childIndex += statements.length;
    
    // Check if this RepeatingBlock has a duration that should be inherited by children
    const blockDuration = sourceNode ? getDuration(sourceNode)[0] : undefined;
    
    if (blockDuration?.original) {
      // Use timer inheritance action when this block has a duration
      return [new PushStatementWithTimerAction(statements, new Duration(blockDuration.original), "primary")];
    } else {
      // Use normal push action when no timer inheritance needed
      return [new PushStatementAction(statements)];
    }
  } 
  

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    // Get the current span (created in enter and updated throughout execution)
    return [
      new StopTimerAction(new StopEvent(new Date())),      
    ];
  }
  /**
   * Implementation of the onBlockStart hook method from the template pattern
   */
  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    
    // Check if this RepeatingBlock has a duration - if so, set timer state to countdown            
    return actions;
  }

  /**
   * Implementation of the onBlockStop hook method from the template pattern
   */
  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}