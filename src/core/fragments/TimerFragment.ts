import { StatementFragment, SourceCodeMetadata } from "../timer.types";

export class TimerFragment implements StatementFragment {
  constructor(public image: string, public meta: SourceCodeMetadata) {
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

    this.duration = (this.seconds +
      this.minutes * 60 +
      this.hours * 60 * 60 +
      this.days * 60 * 60 * 24);
  }

  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  duration: number;
  type: string = "duration";
}

