import { Timestamp } from "./Timestamp";


export class ResultSpan {
  start?: Timestamp;
  stop?: Timestamp;
  label?: string;
  duration(timestamp?: Date): number {
    let now = timestamp ?? new Date();
    return ((this.stop?.time ?? now).getTime() || 0) - (this.start?.time.getTime() || 0);
  }
}
