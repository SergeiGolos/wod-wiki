import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { formatDuration } from "../../time/calculateElapsed";
import { MetricBehavior } from "../../../types/MetricBehavior";

/**
 * **Elapsed** (Runtime layer)
 *
 * The total running time of the block's Time spans — Σ(end − start) for each
 * segment. Paused gaps between spans are excluded.
 *
 * Created by the runtime when collecting output statements.
 *
 * ## Glossary (docs/architecture/time-terminology.md)
 * - **Duration** = the plan (set by parser)
 * - **Time / Spans** = raw clock recordings (source data)
 * - **Elapsed** = sum of span durations, active time only — this fragment
 * - **Total** = lastEnd − firstStart (wall-clock bracket, includes pauses)
 *
 * @example
 * // Two spans: [0-100ms], [200-350ms] → Elapsed = 250ms
 * // (the 100ms paused gap between spans is excluded)
 */
export class ElapsedFragment implements ICodeFragment {
  readonly type: string = "elapsed";
  readonly fragmentType = FragmentType.Elapsed;
  readonly origin: FragmentOrigin = 'collected';
  readonly behavior: MetricBehavior = MetricBehavior.Calculated;

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
