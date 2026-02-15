import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";

/**
 * DurationFragment represents a planned time duration set by a block definition.
 *
 * This is the parser-created fragment from syntax like `5:00` or `:?` (collectible).
 * It answers: "How long should this block run?"
 *
 * - A numeric value means a specific planned duration (e.g., 300000ms for `5:00`).
 * - `undefined` (from `:?`) means the duration is collectible — the actual time
 *   will be recorded at runtime and used to score the workout.
 *
 * ## Relationship to other time fragments
 * - **DurationFragment** = the plan (set by parser or compiler)
 * - **SpansFragment** = the raw clock recordings (start/stop timestamps)
 * - **ElapsedFragment** = derived: sum of active spans
 * - **TotalFragment** = derived: wall-clock bracket from first start to last end
 */
export class DurationFragment implements ICodeFragment {
  readonly value: number | undefined;
  readonly origin: FragmentOrigin;

  /**
   * Creates a new DurationFragment.
   *
   * @param image The duration string (e.g., "5:00", "1:30:00") or ":?" for collectible
   * @param meta Code metadata for source location
   * @param forceCountUp If true, timer counts up even with explicit duration (^ modifier)
   */
  constructor(
    public image: string,
    public meta: CodeMetadata,
    public readonly forceCountUp: boolean = false
  ) {
    if (this.image === ':?') {
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
      this.original = undefined;
      this.value = undefined;
      this.origin = 'runtime';
    } else {
      const digits = this.image
        .split(":")
        .map((segment: string) => 1 * (segment === "" ? 0 : Number(segment)))
        .reverse();

      while (digits.length < 4) {
        digits.push(0);
      }
      this.days = digits[3];
      this.hours = digits[2];
      this.minutes = digits[1];
      this.seconds = digits[0];

      if (this.seconds < 0 || this.minutes < 0 || this.hours < 0 || this.days < 0) {
        throw new Error(`Timer components cannot be negative: ${this.image}`);
      }

      if (this.seconds > 59 && (this.minutes > 0 || this.hours > 0 || this.days > 0)) {
        throw new Error(`Invalid seconds component: ${this.seconds} (must be < 60 if other components present)`);
      }

      if (this.minutes > 59 && (this.hours > 0 || this.days > 0)) {
        throw new Error(`Invalid minutes component: ${this.minutes} (must be < 60 if hours/days present)`);
      }

      this.original = (this.seconds +
        this.minutes * 60 +
        this.hours * 60 * 60 +
        this.days * 60 * 60 * 24) * 1000;

      this.value = this.original;
      this.origin = 'parser';
    }
  }

  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly original: number | undefined;
  readonly type: string = "duration";
  readonly fragmentType = FragmentType.Duration;

  /**
   * Determines the intended timer direction based on value and modifiers.
   * - If forceCountUp is true (^ modifier), always returns 'up'
   * - If value > 0 (explicit duration), returns 'down' (countdown)
   * - If value === 0, undefined, or collectible, returns 'up' (count-up)
   */
  get direction(): 'up' | 'down' {
    if (this.forceCountUp) {
      return 'up';
    }
    if (this.value === undefined) {
      return 'up';
    }
    return this.value > 0 ? 'down' : 'up';
  }
}
