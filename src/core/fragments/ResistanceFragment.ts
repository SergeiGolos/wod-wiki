import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class ResistanceFragment implements CodeFragment {
  constructor(public value: string, public units: string, public meta?: CodeMetadata) { }
  type: string = "resistance";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, rounds?: number): void {
    if (!isNaN(Number(this.value))) {
      metric.values.push({
        type: "resistance",
        value: Number(this.value),
        unit: this.units || "kg",
        round: rounds
      });
    }
  }
}
