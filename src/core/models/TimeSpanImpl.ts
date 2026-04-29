import type { TimeSpan as TimeSpanShape } from './TimeSpan';

export class TimeSpan implements TimeSpanShape {
  constructor(
    public started: number,
    public ended?: number
  ) {}

  get duration(): number {
    const end = this.ended ?? Date.now();
    return Math.max(0, end - this.started);
  }

  get isOpen(): boolean {
    return this.ended === undefined;
  }

  get startDate(): Date {
    return new Date(this.started);
  }

  get endDate(): Date | undefined {
    return this.ended ? new Date(this.ended) : undefined;
  }
}

