import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { formatDuration } from "../../time/calculateElapsed";

/**
 * TotalFragment represents the wall-clock bracket from the first span
 * start to the last span end (or current time if the last span is open).
 *
 * Unlike ElapsedFragment, this **includes** paused gaps between spans.
 * It answers: "How much wall-clock time passed from when we started
 * until we finished?"
 *
 * This fragment is created by the runtime when collecting output statements.
 *
 * ## Relationship to other time fragments
 * - **SpansFragment** = source data (raw timestamps)
 * - **ElapsedFragment** = active time only (excludes paused gaps)
 * - **TotalFragment** = wall-clock bracket (this fragment, includes paused gaps)
 *
 * @example
 * // Two spans: [t=0 to t=100ms], [t=200 to t=350ms] → total = 350ms
 * // (the 100ms paused gap IS included)
 */
export class TotalFragment implements ICodeFragment {
  readonly type: string = "total";
  readonly fragmentType = FragmentType.Total;
  readonly origin: FragmentOrigin = 'collected';

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
