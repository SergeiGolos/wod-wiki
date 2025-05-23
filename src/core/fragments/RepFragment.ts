import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RepFragment implements CodeFragment {
  constructor(public reps?: number, public meta?: CodeMetadata) { }
  type: string = "rep";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, rounds?: number): void {
    if (typeof this.reps === "number") {
      metric.values.push({
        type: "repetitions",
        value: this.reps,
        unit: "reps",
        round: rounds
      });
    }
  }
}
