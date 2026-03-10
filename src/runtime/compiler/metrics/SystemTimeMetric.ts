import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * **TimeStamp** (Runtime layer)
 *
 * The system time (Date.now()) when a message is logged.
 * Provides a ground-truth wall-clock reference independent of the
 * runtime clock, which can be frozen during event chain execution.
 *
 * ## When it's created
 * Created during output collection alongside ElapsedMetric and TotalMetric.
 *
 * ## Glossary (docs/architecture/time-terminology.md)
 * - **Duration** = the plan (set by parser)
 * - **Time / Spans** = clock-relative recordings (may use frozen/faked clock)
 * - **Elapsed** = Σ(end − start), active time only
 * - **Total** = lastEnd − firstStart (wall-clock bracket)
 * - **TimeStamp** = real Date.now() time — this metrics
 */
export class SystemTimeMetric implements IMetric {
  readonly type = MetricType.SystemTime;
  readonly origin: MetricOrigin = 'tracked';

  /**
   * @param value The real system time as a Date object
   * @param sourceBlockKey Block that produced this metrics
   */
  constructor(
    readonly value: Date,
    readonly sourceBlockKey?: string,
  ) {}

  /** The timestamp this metrics was created (same as value for system time) */
  get timestamp(): Date {
    return this.value;
  }

  /** ISO 8601 formatted system time */
  get image(): string {
    return this.value.toISOString();
  }
}
