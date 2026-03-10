import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";
import { formatDuration } from "../../time/calculateElapsed";

/**
 * **Total** (Runtime layer)
 *
 * The total time including pauses — last span's end minus first span's start.
 * Represents the wall-clock bracket of the block's execution.
 *
 * Unlike Elapsed, this **includes** paused gaps between spans.
 *
 * Created by the runtime when collecting output statements.
 *
 * ## Glossary (docs/architecture/time-terminology.md)
 * - **Duration** = the plan (set by parser)
 * - **Time / Spans** = raw clock recordings (source data)
 * - **Elapsed** = Σ(end − start), active time only (excludes pauses)
 * - **Total** = wall-clock bracket — this metrics (includes pauses)
 *
 * @example
 * // Two spans: [t=0 to t=100ms], [t=200 to t=350ms] → Total = 350ms
 * // (the 100ms paused gap IS included)
 */
export class TotalMetric implements IMetric {
  readonly type = MetricType.Total;
  readonly origin: MetricOrigin = 'analyzed';

  /**
   * @param value Total wall-clock time in milliseconds
   * @param sourceBlockKey Block that produced this measurement
   * @param timestamp When this metrics was created
   */
  constructor(
    readonly value: number,
    readonly sourceBlockKey?: string,
    readonly timestamp?: Date,
  ) {}

  /** Human-readable total time (e.g., "5:03") */
  get image(): string {
    return formatDuration(this.value);
  }
}
