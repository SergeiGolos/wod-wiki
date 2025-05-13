import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import {
  ITimerRuntime,
  IRuntimeAction,
  TimeSpanDuration,
  PrecompiledNode,
} from "@/core/timer.types";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";
import { LapFragment } from "@/core/fragments/LapFragment";
import { getLap } from "./readers/getLap";
import { StartEvent } from "../inputs/StartEvent";
import { getDuration } from "./readers/getDuration";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StopTimerAction } from "../actions/StopTimerAction";
import { StopEvent } from "../inputs/StopEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { SetDurationAction } from "../outputs/SetDurationAction";

export class TimedGroupBlock extends RuntimeBlock {
  constructor(source: PrecompiledNode) {
    super([source]);
    
    // Initialize state in context
    this.ctx.childIndex = 0; // Current round for the current child
    this.ctx.lastLap = "";
  }

  /**
   * Implementation of the doEnter hook method from the template pattern
   */
  protected doEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    return [      
      new StartTimerAction(new StartEvent(new Date())),
      ...this.doNext(runtime),
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime"),
    ];
  }
  /**
   * Implementation of the doNext hook method from the template pattern
   */
  protected doNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    
    // Safe access to childIndex from context
    if (this.ctx.childIndex !== undefined && 
        this.sources[0] && 
        (this.ctx.childIndex >= this.sources[0].children.length || this.ctx.lastLap === "-")) {
      this.ctx.childIndex = 0;   
      this.ctx.index += 1;             
    }          

    const duration = this.get(getDuration)[0];
    const spanDuration = new TimeSpanDuration(
      duration?.original ?? 0, 
      this.ctx.spans);
    
    const remaining = spanDuration.remaining();
    if ((remaining?.original != undefined) && (remaining.original == 0 || remaining.original < 0)) {
      return [new PopBlockAction()];
    }

    const statements: PrecompiledNode[] = [];
    let statement: PrecompiledNode | undefined;
    let laps: LapFragment | undefined;
    
    while (true) {      
      if (this.ctx.childIndex !== undefined) {
        this.ctx.childIndex += 1;
      } else {
        this.ctx.childIndex = 1; // Initialize if undefined
      }
      
      const sourceNode = this.sources[0];
      const childIndex = this.ctx.childIndex - 1;
      const childId = sourceNode?.children ? sourceNode.children[childIndex] : undefined;
      statement = childId !== undefined ? runtime.script.getId(childId)?.[0] : undefined;
      
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
      ? [new StartTimerAction(new StartEvent(new Date())),
        new PushStatementAction(statements, true), 
        new SetDurationAction(spanDuration, "primary")]
      : [];
  }

  /**
   * Implementation of the doLeave hook method from the template pattern
   */
  protected doLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [new StopTimerAction(new StopEvent(new Date()))];
  }
}
