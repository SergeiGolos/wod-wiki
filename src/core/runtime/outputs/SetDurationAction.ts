import { OutputAction } from '../OutputAction';
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";

/**
 * Action to report duration information to the UI
 * Used for progress bars and timer displays
 */
export class SetDurationAction extends OutputAction {
  constructor(public duration: number, public timerName: string) {
    super('SET_DURATION');
  }

  getData() {
    return {
      timerName: this.timerName,
      duration: this.duration
    };
  }

  write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>) {
    return [{
      eventType: this.eventType,
      bag: {
        timerName: this.timerName,
        duration: this.duration
      },
      timestamp: new Date()
    }];
  }
}