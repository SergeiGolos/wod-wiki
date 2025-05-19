import { ISpanDuration } from "./ISpanDuration";
import { ITimeSpan } from "./ITimeSpan";
import { Duration } from "./Duration";
import { IDuration } from "./IDuration";
import { DurationSign } from "./DurationSign";

export class TimeSpanDuration extends Duration implements ISpanDuration {
  constructor(
    milliseconds: number, 
    public sign: DurationSign,
     public spans: ITimeSpan[]) {
    super(milliseconds);
    this.spans = spans;   
  }
  
  elapsed(): IDuration {
    return new Duration(this.spans?.reduce((total, span) => {
      const start = span.start?.timestamp ?? new Date();
      const stop = span.stop?.timestamp ?? new Date();
      return total + (stop.getTime() - start.getTime());
    }, 0) ?? 0);
  }

  remaining(): IDuration | undefined {
    return (this.original ?? 0) !== 0
      ? new Duration((this.original ?? 0) - (this.elapsed()?.original ?? 0))
      : undefined;
  }
}
