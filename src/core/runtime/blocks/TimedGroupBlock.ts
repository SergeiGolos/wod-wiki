import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import {
  IRuntimeBlock,
  StatementNodeDetail,
  ITimerRuntime,
  IRuntimeAction,
  TimeSpanDuration,
} from "@/core/timer.types";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { SetTimeSpanAction } from "../outputs/SetTimeSpanAction";
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

export class TimedGroupBlock extends RuntimeBlock implements IRuntimeBlock {
  childIndex: number = 0; // Current round for the current child
  lastLap: string = "";
  constructor(source: StatementNodeDetail) {
    super([source]);    
  }

  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    console.debug(`+=== enter : ${this.blockId}`);

    return [      
      new StartTimerAction(new StartEvent(new Date())),
      ...this.next(runtime),
      new SetButtonsAction([endButton, pauseButton], "system"),
      new SetButtonsAction([completeButton], "runtime"),
    ];
  }
  next(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }
    console.debug(`+=== : ${this.blockId}`);
    if (this.childIndex >= this.sources?.[0]?.children.length || this.lastLap === "-") {
      this.childIndex = 0;   
      this.index += 1;             
    }          

    const duration = this.get(getDuration)[0];
    const spanDuration = new TimeSpanDuration(
      duration.original ?? 0, 
      this.spans);
    
    const remaining = spanDuration.remaining();
    if ((remaining?.original != undefined) && (remaining.original == 0 || remaining.original < 0)) {
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
      ? [new StartTimerAction(new StartEvent(new Date())),
        new PushStatementAction(statements, true), 
        new SetDurationAction(spanDuration, "primary")]
      : [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.debug(`+=== leave : ${this.blockId}`);
    return [new StopTimerAction(new StopEvent(new Date()))];

  }
}
