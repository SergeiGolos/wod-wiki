import { TimerEvent } from "./timer.runtime";

export class ResultSpan {
  start?: TimerEvent;
  stop?: TimerEvent;
  label?: string;
  duration(timestamp?: Date): number {
    let now = timestamp ?? new Date();
    return ((this.stop?.timestamp ?? now).getTime() || 0) - (this.start?.timestamp.getTime() || 0);
  }
}
