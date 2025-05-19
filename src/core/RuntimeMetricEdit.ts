import { BlockKey } from "./BlockKey";
import { MetricValue } from "./MetricValue";

// Represents an instruction to update a specific metric for a result span

export type RuntimeMetricEdit = {
  blockKey: BlockKey;
  index: number;
  metricType: "repetitions" | "resistance" | "distance";
  newValue: MetricValue; // The parsed new value
  createdAt: Date; // Timestamp when the edit was created
};
