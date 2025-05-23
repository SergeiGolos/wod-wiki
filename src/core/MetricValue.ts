
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" ;
  value: number;
  unit: string;
};
