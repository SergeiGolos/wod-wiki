/**
 * TimeSpan represents a discrete period of time within a larger execution span.
 * Multiple spans allow for pause/resume tracking.
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
     * Total duration of this span in milliseconds.
     * Uses current time if the span is still open.
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
