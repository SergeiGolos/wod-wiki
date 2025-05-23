import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";


export class DistanceFragment implements CodeFragment {
  constructor(public value: string, public units: string, public meta?: CodeMetadata) { }
  type: string = "distance";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, rounds?: number): void {
    if (!isNaN(Number(this.value))) {
      metric.values.push({
        type: "distance",
        value: Number(this.value),
        unit: this.units || "m",
        round: rounds
      });
    }
  }
}
