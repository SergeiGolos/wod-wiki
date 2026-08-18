import type { TimeSpan } from './TimeSpan';

export interface IDuration {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  original?: number;
}

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

    this.milliseconds = Math.round(remaining - this.seconds * 1000);
  }
}

export class SpanDuration extends Duration {
  constructor(spans: TimeSpan[]) {
    const total = spans.reduce((sum, span) => {
      const end = span.ended ?? Date.now();
      return sum + Math.max(0, end - span.started);
    }, 0);
    super(total);
  }
}
