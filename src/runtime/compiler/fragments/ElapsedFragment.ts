import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { formatDuration } from "../../time/calculateElapsed";

/**
 * ElapsedFragment represents the total **active** time across all spans.
 *
 * Computed as the sum of all span durations, including the current open
 * span (if the clock is still running). Paused gaps between spans are
 * excluded.
 *
 * This fragment is created by the runtime when collecting output statements.
 *
 * ## Relationship to other time fragments
 * - **SpansFragment** = source data (raw timestamps)
 * - **ElapsedFragment** = sum of span durations (this fragment)
 * - **TotalFragment** = wall-clock bracket (includes paused gaps)
 *
 * @example
 * // Two spans: [0-100ms], [200-350ms] → elapsed = 250ms
 * // (the 100ms gap between spans is excluded)
 */
export class ElapsedFragment implements ICodeFragment {
  readonly type: string = "elapsed";
  readonly fragmentType = FragmentType.Elapsed;
  readonly origin: FragmentOrigin = 'collected';

  /**
   * @param value Elapsed time in milliseconds
   * @param sourceBlockKey Block that produced this measurement
   * @param timestamp When this fragment was created
   */
  constructor(
    readonly value: number,
    readonly sourceBlockKey?: string,
    readonly timestamp?: Date,
  ) {}

  /** Human-readable elapsed time (e.g., "5:03") */
  get image(): string {
    return formatDuration(this.value);
  }
}
