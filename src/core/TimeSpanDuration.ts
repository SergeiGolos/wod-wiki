import { ISpanDuration } from "./ISpanDuration";
import { ITimeSpan } from "./ITimeSpan";
import { Duration } from "./types/Duration";
import { IDuration } from "./IDuration";
import { DurationSign } from "./types/DurationSign";

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
      const startTime = span.start?.timestamp;

      // If a span somehow has no start time, skip it (shouldn't happen with current logic)
      if (!startTime) {
        return total;
      }

      // If span.stop is undefined (timer is running for this span),
      // use the current time as its effective stop time for this calculation.
      // Otherwise, use the actual recorded stop time.
      const stopTime = span.stop?.timestamp ?? new Date();

      return total + (stopTime.getTime() - startTime.getTime());
    }, 0) ?? 0);
  }

  remaining(): IDuration | undefined {
    return (this.original ?? 0) !== 0
      ? new Duration((this.original ?? 0) - (this.elapsed()?.original ?? 0))
      : undefined;
  }
}
