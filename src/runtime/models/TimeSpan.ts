/**
 * TimeSpan represents a discrete segment of a block's **Time** — a single
 * start/stop recording within the spans collection.
 *
 * Multiple TimeSpans allow for pause/resume tracking.
 *
 * Note: The `.duration` getter computes the length of this individual span
 * (end − start). This differs from the glossary term **Duration**, which
 * refers to the parser-defined planned target. To avoid confusion, prefer
 * the term "span length" when discussing individual span measurements.
 *
 * @see docs/architecture/time-terminology.md
 */
export class TimeSpan {
    constructor(
        public started: number,
        public ended?: number
    ) { }

    static fromJSON(json: any): TimeSpan {
        return new TimeSpan(json.started, json.ended);
    }

    /**
     * Create a TimeSpan from Date objects (legacy support/compatibility)
     */
    static fromDates(start: Date, end?: Date): TimeSpan {
        return new TimeSpan(start.getTime(), end?.getTime());
    }

    /**
     * Length of this individual span in milliseconds.
     * Uses current time if the span is still open.
     *
     * Note: Not to be confused with the glossary term "Duration" which
     * refers to the parser-defined planned target (DurationFragment).
     */
    get duration(): number {
        const end = this.ended ?? Date.now();
        return Math.max(0, end - this.started);
    }

    /**
     * Whether the span is currently open (no end time).
     */
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
