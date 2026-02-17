import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { formatDuration } from "../../time/calculateElapsed";
import { MetricBehavior } from "../../../types/MetricBehavior";

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
 * - **Total** = wall-clock bracket — this fragment (includes pauses)
 *
 * @example
 * // Two spans: [t=0 to t=100ms], [t=200 to t=350ms] → Total = 350ms
 * // (the 100ms paused gap IS included)
 */
export class TotalFragment implements ICodeFragment {
  readonly type: string = "total";
  readonly fragmentType = FragmentType.Total;
  readonly origin: FragmentOrigin = 'collected';
  readonly behavior: MetricBehavior = MetricBehavior.Calculated;

  /**
   * @param value Total wall-clock time in milliseconds
   * @param sourceBlockKey Block that produced this measurement
   * @param timestamp When this fragment was created
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
