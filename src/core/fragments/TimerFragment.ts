import { CodeFragment, FragmentType } from "../types/CodeFragment";
import { CodeMetadata } from "../types/CodeMetadata";

export class TimerFragment implements CodeFragment {
  constructor(public image: string, public meta: CodeMetadata) {
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
  }

  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly original: number; // in ms
  readonly type: string = "duration";
  readonly fragmentType = FragmentType.Timer;
}
