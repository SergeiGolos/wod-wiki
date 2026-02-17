import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { MetricBehavior } from "../../../types/MetricBehavior";

/**
 * **TimeStamp** (Runtime layer)
 *
 * The system time (Date.now()) when a message is logged.
 * Provides a ground-truth wall-clock reference independent of the
 * runtime clock, which can be frozen during event chain execution.
 *
 * ## When it's created
 * Created during output collection alongside ElapsedFragment and TotalFragment.
 *
 * ## Glossary (docs/architecture/time-terminology.md)
 * - **Duration** = the plan (set by parser)
 * - **Time / Spans** = clock-relative recordings (may use frozen/faked clock)
 * - **Elapsed** = Σ(end − start), active time only
 * - **Total** = lastEnd − firstStart (wall-clock bracket)
 * - **TimeStamp** = real Date.now() time — this fragment
 */
export class SystemTimeFragment implements ICodeFragment {
  readonly type: string = "system-time";
  readonly fragmentType = FragmentType.SystemTime;
  readonly origin: FragmentOrigin = 'runtime';
  readonly behavior: MetricBehavior = MetricBehavior.Recorded;

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
