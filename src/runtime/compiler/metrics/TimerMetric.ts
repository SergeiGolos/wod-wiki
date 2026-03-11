import { IMetric, MetricType, MetricOrigin } from "../../../core/models/Metric";

/**
 * @deprecated Use DurationMetric instead. TimerMetric is a legacy alias
 * kept for backwards compatibility during the terminology migration.
 * 
 * This class produces a **Duration** metrics (how long to run),
 * not runtime **Time** state (spans collection).
 * 
 * @see docs/architecture/time-terminology.md
 */
export class TimerMetric implements IMetric {
  readonly value: number | undefined;
  readonly origin: MetricOrigin;

  /**
   * Creates a new TimerMetric.
   * 
   * @param image The timer string (e.g., "5:00", "1:30:00") or ":?" for collectible
   * @param forceCountUp If true, timer counts up even with explicit duration (^ modifier)
   */
  constructor(
    public image: string,
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
      this.origin = 'hinted';
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
  readonly original: number | undefined; // in ms
  readonly type = MetricType.Duration;

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
