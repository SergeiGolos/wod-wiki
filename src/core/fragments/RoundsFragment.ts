import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class RoundsFragment implements CodeFragment {
  constructor(public count: number, public meta?: CodeMetadata) { }
  type: string = "rounds";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, rounds?: number): void {
    if (typeof this.count === "number") {
      metric.values.push({
        type: "rounds",
        value: this.count,
        unit: "rounds",
        round: rounds
      });
    }
  }
}
