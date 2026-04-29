export interface RuntimeStackTracker {
  recordMetric: (category: string, name: string, value: number, unit: string) => void;
}

