import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { RuntimeBlock } from "./RuntimeBlock";
import { PopBlockAction } from "../actions/PopBlockAction";
import { PushStatementAction } from "../actions/PushStatementAction";
import { PushStatementWithTimerAction } from "../actions/PushStatementWithTimerAction";
import { SetDurationAction } from "../outputs/SetDurationAction";
import { completeButton, endButton, pauseButton } from "@/components/buttons/timerButtons";
import { SetButtonAction } from "../outputs/SetButtonAction";

import { StopTimerAction } from "../actions/StopTimerAction";
import { StopEvent } from "../inputs/StopEvent";
import { Duration } from "@/core/Duration";
import { getDuration } from "./readers/getDuration";

export class TimedGroupBlock extends RuntimeBlock {
  private childIndex: number = 0;
  private timerId?: string; // To store the timer ID if this block starts one
  constructor(compiledMetrics: RuntimeMetric[], source?: JitStatement[]) {
    super(compiledMetrics, source);    
    const firstSource = this._legacySources?.[0];
    if (firstSource) {
      const groupDuration = getDuration(firstSource)[0];
      if (groupDuration && groupDuration.original) {
        this.duration = groupDuration.original;
      }
    }
  }

  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    if (this.duration) {
      // Placeholder for timerId generation
      this.timerId = `timer_${Math.random().toString(36).substring(2, 9)}`;
      actions.push(new SetDurationAction(this.duration, this.timerId));
      actions.push(new SetButtonAction("system", [endButton, pauseButton]));
      actions.push(new SetButtonAction("runtime", [completeButton]));
    } else {
      actions.push(new SetButtonAction("system", [endButton]));
    }
    
    actions.push(...this.onNext(runtime));
    return actions;
  }

  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
    const endEvent = runtime.history.find((event) => event.name === "end");
    if (endEvent) {
      return [new PopBlockAction()];
    }

    const statements = this.nextChildStatements(runtime, this.childIndex);

    if (statements.length === 0) {
      if (!this.duration) {
        return [new PopBlockAction()];
      }
      return []; 
    }

    this.childIndex += statements.length;

    if (this.duration && this.timerId) {
      return [
        new PushStatementWithTimerAction(statements, new Duration(this.duration), this.timerId),
      ];
    } else {
      return [new PushStatementAction(statements)];
    }
  }

  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    if (this.timerId) {
      actions.push(new StopTimerAction(new StopEvent(new Date())));
    }
    return actions;
  }

  protected onBlockStart(_runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    if (!(this.duration && this.timerId)) {          
        this.timerId = `timer_${Math.random().toString(36).substring(2, 9)}`; // Placeholder
        actions.push(new SetDurationAction(this.duration!, this.timerId));        
        actions.push(new SetButtonAction("system", [endButton, pauseButton]));
        actions.push(new SetButtonAction("runtime", [completeButton]));
    }
    return actions;
  }

  protected onBlockStop(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
}
