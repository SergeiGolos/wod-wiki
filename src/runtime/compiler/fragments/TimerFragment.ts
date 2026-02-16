import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { MetricBehavior } from "../../../types/MetricBehavior";

export class TimerFragment implements ICodeFragment {
  readonly value: number | undefined;
  readonly origin: FragmentOrigin;

  /**
   * Creates a new TimerFragment.
   * 
   * @param image The timer string (e.g., "5:00", "1:30:00") or ":?" for collectible
   * @param meta Code metadata for source location
   * @param forceCountUp If true, timer counts up even with explicit duration (^ modifier)
   */
  constructor(
    public image: string,
    public meta: CodeMetadata,
    public readonly forceCountUp: boolean = false
  ) {
    // Check if this is a collectible timer (:?)
    if (this.image === ':?') {
      // Placeholder values for collectible timers - actual duration will be collected at runtime
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
      this.original = undefined;
      this.value = undefined;
      this.origin = 'runtime';
      this.behavior = MetricBehavior.Hint;
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
      this.behavior = MetricBehavior.Defined;
    }
  }

  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly original: number | undefined; // in ms
  readonly type: string = "duration";
  readonly fragmentType = FragmentType.Timer;
  readonly behavior: MetricBehavior;

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
      return 'up'; // Collectible timers count up by default
    }
    return this.value > 0 ? 'down' : 'up';
  }
}
