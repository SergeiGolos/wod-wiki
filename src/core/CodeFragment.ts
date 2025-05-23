import { CodeMetadata } from "./CodeMetadata";


export interface CodeFragment {
  type: string;
  meta?: CodeMetadata;
  /**
   * Applies this fragment's data to a RuntimeMetric (mutates the metric in place).
   * Each fragment type should implement this to add its value(s) to the metric.
   */
  applyToMetric(metric: import("./RuntimeMetric").RuntimeMetric, rounds?: number): void;
}
