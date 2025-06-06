import { OutputAction } from '../OutputAction';
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";

export enum TimerState {
  STOPPED = 'STOPPED',
  RUNNING_COUNTDOWN = 'RUNNING_COUNTDOWN',
  RUNNING_COUNTUP = 'RUNNING_COUNTUP',
  PAUSED = 'PAUSED'
}

export class SetTimerStateAction extends OutputAction {
  constructor(public state: TimerState, public name: string) {
    super('SET_TIMER_STATE');
  }

  getData() {
    return {
      name: this.name,
      state: this.state
    };
  }

  write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>) {
    return [{
      eventType: this.eventType,
      bag: {
        name: this.name,
        state: this.state
      },
      timestamp: new Date()
    }];
  }
}