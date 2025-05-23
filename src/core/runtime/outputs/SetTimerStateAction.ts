import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";

/**
 * Enum defining the possible timer states
 */
export enum TimerState {
  RUNNING_COUNTDOWN = "RUNNING_COUNTDOWN", // Timer is running with countdown
  RUNNING_COUNTUP = "RUNNING_COUNTUP",     // Timer is running with countup
  PAUSED = "PAUSED",                       // Timer is paused
  STOPPED = "STOPPED"                      // Timer is stopped
}

/**
 * Action to set the current timer state in the UI
 */
export class SetTimerStateAction extends OutputAction {
  constructor(private state: TimerState, private target: string = "primary") {
    super('SET_TIMER_STATE');
  }

  write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
    return [{
      eventType: this.eventType,
      bag: { 
        state: this.state,
        target: this.target
      },
      timestamp: new Date()
    }];
  }
}