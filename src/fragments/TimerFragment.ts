import { ICodeFragment, FragmentType } from "../core/models/CodeFragment";
import { CodeMetadata } from "../core/models/CodeMetadata";

export class TimerFragment implements ICodeFragment {
  readonly value: number;

  /**
   * Creates a new TimerFragment.
   * 
   * @param image The timer string (e.g., "5:00", "1:30:00")
   * @param meta Code metadata for source location
   * @param forceCountUp If true, timer counts up even with explicit duration (^ modifier)
   */
  constructor(
    public image: string, 
    public meta: CodeMetadata,
    public readonly forceCountUp: boolean = false
  ) {
    const digits = this.image
      .split(":")
      .map((segment: any) => 1 * (segment == "" ? 0 : segment))
      .reverse();

    while (digits.length < 4) {
      digits.push(0);
    }
    this.days = digits[3];
    this.hours = digits[2];
    this.minutes = digits[1];
    this.seconds = digits[0];

    this.original = (this.seconds +
      this.minutes * 60 +
      this.hours * 60 * 60 +
      this.days * 60 * 60 * 24) * 1000;
    
    this.value = this.original;
  }

  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly original: number; // in ms
  readonly type: string = "duration";
  readonly fragmentType = FragmentType.Timer;
  
  /**
   * Determines the intended timer direction based on value and modifiers.
   * - If forceCountUp is true (^ modifier), always returns 'up'
   * - If value > 0 (explicit duration), returns 'down' (countdown)
   * - If value === 0 or undefined, returns 'up' (count-up)
   */
  get direction(): 'up' | 'down' {
    if (this.forceCountUp) {
      return 'up';
    }
    return this.value > 0 ? 'down' : 'up';
  }
}
