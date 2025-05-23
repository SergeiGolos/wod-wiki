import { CodeFragment } from "../CodeFragment";
import { CodeMetadata } from "../CodeMetadata";

export class EffortFragment implements CodeFragment {
  constructor(public effort: string, public meta?: CodeMetadata) { }
  type: string = "effort";
  applyToMetric(metric: import("../RuntimeMetric").RuntimeMetric, _rounds?: number): void {
    if (this.effort) {
      metric.effort = this.effort;
    }
  }
}
