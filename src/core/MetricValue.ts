
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp";
  value: number;
  unit: string;
};
