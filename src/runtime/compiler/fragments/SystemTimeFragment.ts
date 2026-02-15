import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";

/**
 * SystemTimeFragment captures the actual wall-clock time from `Date.now()`
 * at the moment of collection — as opposed to the `IRuntimeClock` time
 * which can be faked or frozen during event chain execution.
 *
 * This fragment provides a ground-truth timestamp for:
 * - Audit trails and logging
 * - Correlating runtime events with real-world time
 * - Detecting clock drift between the runtime clock and system clock
 *
 * ## When it's created
 * Created during output collection alongside ElapsedFragment and TotalFragment.
 * The `IRuntimeClock.now` may be frozen during event dispatch, so this
 * fragment gives consumers the actual system time independently.
 *
 * ## Relationship to other time fragments
 * - **SpansFragment** = clock-relative timestamps (may use frozen/faked clock)
 * - **SystemTimeFragment** = real `Date.now()` time (this fragment)
 */
export class SystemTimeFragment implements ICodeFragment {
  readonly type: string = "system-time";
  readonly fragmentType = FragmentType.SystemTime;
  readonly origin: FragmentOrigin = 'runtime';

  /**
   * @param value The real system time as a Date object
   * @param sourceBlockKey Block that produced this fragment
   */
  constructor(
    readonly value: Date,
    readonly sourceBlockKey?: string,
  ) {}

  /** The timestamp this fragment was created (same as value for system time) */
  get timestamp(): Date {
    return this.value;
  }

  /** ISO 8601 formatted system time */
  get image(): string {
    return this.value.toISOString();
  }
}
