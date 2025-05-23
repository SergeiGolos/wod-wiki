import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class IncrementFragment implements CodeFragment {
  constructor(public image: string, public meta?: CodeMetadata) {
    this.increment = image == "^" ? 1 : -1;
  }
  type: string = "increment";
  increment: number;
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, rounds?: number): void {
    metric.values.push({
      type: "increment",
      value: this.increment,
      unit: "",
      round: rounds
    });
  }
}
