import { IDuration } from "../IDuration";
import { ITimeSpan } from "../ITimeSpan";

export class Duration implements IDuration {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;

  constructor(public original?: number) {
    let remaining = original ?? 0;

    this.days = Math.floor(remaining / 86400000);
    remaining %= 86400000;

    this.hours = Math.floor(remaining / 3600000);
    remaining %= 3600000;

    this.minutes = Math.floor(remaining / 60000);
    remaining %= 60000;

    this.seconds = Math.floor(remaining / 1000);

    this.milliseconds = Math.round((remaining - this.seconds * 1000));
  }
}

export class SpanDuration extends Duration {
  constructor(spans: ITimeSpan[]) {
    const total = spans.reduce((total, span) => {
      const startTime = span.start?.timestamp;      
      if (!startTime) {
        return total;
      }

      // If span.stop is undefined (timer is running for this span),
      // use the current time as its effective stop time for this calculation.
      // Otherwise, use the actual recorded stop time.
      const stopTime = span.stop?.timestamp ?? new Date();
      return total + (stopTime.getTime() - startTime.getTime());
    }, 0)
    super(total);
  }
}
