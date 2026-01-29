import { TimeSpan } from "./CollectionSpan";

export class Duration{
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
  constructor(spans: TimeSpan[]) {
    const total = spans.reduce((total, span) => {
      // Use span.duration which handles open spans automatically
      return total + span.duration;
    }, 0)
    super(total);
  }
}
