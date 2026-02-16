import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { MetricBehavior } from "../../../types/MetricBehavior";

/**
 * CurrentRoundFragment represents the live round counter during execution.
 *
 * This is a **runtime** fragment — it is NOT set by the parser. It tracks
 * which round the block is currently executing (e.g., "Round 2 of 5").
 *
 * ## Relationship to RoundsFragment
 * - **RoundsFragment** (parser-origin) = the plan: how many rounds total
 *   (e.g., `(3)` → count = 3, or `(21-15-9)` → count = 3).
 * - **CurrentRoundFragment** (runtime-origin) = recorded progress: which
 *   round is currently active.
 *
 * ## Relationship to re-entry behaviors
 * Created by the Re-Entry / Round output aspect on mount and each `onNext()`.
 * Written to `round` memory tag alongside timer milestone outputs.
 *
 * @example
 * // Round 2 of 5
 * new CurrentRoundFragment(2, 5, 'block-key', new Date())
 *
 * // Round 3 (unbounded — AMRAP)
 * new CurrentRoundFragment(3, undefined, 'block-key', new Date())
 */
export class CurrentRoundFragment implements ICodeFragment {
  readonly type: string = "current-round";
  readonly fragmentType = FragmentType.CurrentRound;
  readonly origin: FragmentOrigin = 'runtime';
  readonly behavior: MetricBehavior = MetricBehavior.Recorded;
  readonly value: { current: number; total: number | undefined };
  readonly image: string;

  /**
   * @param current The current round number (1-based)
   * @param total Total number of planned rounds (undefined for unbounded)
   * @param sourceBlockKey Block that owns this round counter
   * @param timestamp When this fragment was created
   */
  constructor(
    readonly current: number,
    readonly total: number | undefined,
    readonly sourceBlockKey?: string,
    readonly timestamp?: Date,
  ) {
    this.value = { current, total };
    this.image = total !== undefined
      ? `Round ${current} of ${total}`
      : `Round ${current}`;
  }
}
