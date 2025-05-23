
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "lap" | "rounds" | "increment";
  value: number;
  unit: string;
  round?: number;
};
